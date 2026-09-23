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
    const uniqueName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.xlsx`;
    tempFilePath = path.join(tempDir, uniqueName);

    await fs.writeFile(tempFilePath, buffer);

    // 2. Execute Python Parser Script
    const scriptPath = path.join(process.cwd(), 'scripts', 'parse_tally_excel.py');
    
    const { stdout, stderr } = await execFileAsync('python', [scriptPath, tempFilePath], {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stderr && stderr.includes('Error')) {
      console.warn('Python script warning/error stderr:', stderr);
    }

    // 3. Parse JSON output returned by Python script
    const resultJson = JSON.parse(stdout);

    // 4. Clean up temp file
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

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
