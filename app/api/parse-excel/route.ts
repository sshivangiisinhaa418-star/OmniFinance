import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No Excel file uploaded' }, { status: 400 });
    }

    // 1. Save uploaded Excel file to temp directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const tempDir = os.tmpdir();
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ext = path.extname(file.name || '').toLowerCase() || '.xlsx';
    tempFilePath = path.join(tempDir, `upload_${uniqueId}${ext}`);
    const tempOutputPath = path.join(tempDir, `parsed_${uniqueId}.json`);

    await fs.writeFile(tempFilePath, buffer);

    // 2. Execute Python Parser Script with output file destination
    const scriptPath = path.join(process.cwd(), 'scripts', 'parse_tally_excel.py');
    
    const { stdout, stderr } = await execFileAsync('python', [scriptPath, tempFilePath, tempOutputPath], {
      maxBuffer: 150 * 1024 * 1024, // 150MB buffer fallback
    });

    if (stderr && stderr.includes('Error')) {
      console.warn('Python script warning/error stderr:', stderr);
    }

    // 3. Parse JSON output returned by Python script (prefer file read to avoid stdout buffer limits)
    let resultJson: any;
    try {
      const fileData = await fs.readFile(tempOutputPath, 'utf-8');
      resultJson = JSON.parse(fileData);
    } catch {
      resultJson = JSON.parse(stdout);
    }

    // 4. Clean up temp files
    await fs.unlink(tempFilePath).catch(() => {});
    await fs.unlink(tempOutputPath).catch(() => {});

    return NextResponse.json({
      success: true,
      pythonExecuted: true,
      data: resultJson,
    });
  } catch (err: any) {
    console.error('API /api/parse-excel error:', err);

    // Cleanup temp file if error occurred
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    return NextResponse.json(
      {
        error: err.message || 'Failed to parse Excel file via Python script',
        details: String(err),
      },
      { status: 500 }
    );
  }
}
