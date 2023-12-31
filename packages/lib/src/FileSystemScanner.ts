import { readdir, stat } from 'fs/promises';
import { resolve } from 'path';

const FILE_EXTENSION = '.mp3';

export type ScannedItem = {
  isFile: boolean;
  isDir: boolean;
  fullPath: string;
};

export class FileSystemScanner {
  rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async scan(nextDir: string = this.rootDir) {
    let result: ScannedItem[] = [];
    const dirEntries = await this.scanDir(nextDir);

    const files = dirEntries.filter((_) => _.isFile);
    const dirs = dirEntries.filter((_) => _.isDir);
    for (const dir of dirs) {
      result = [...result, ...(await this.scan(dir.fullPath))];
    }

    result = [...files, ...result].filter((_) => _.fullPath.endsWith(FILE_EXTENSION));

    process.env.LOG_INFO === 'true' && console.log(`Scanned: '${nextDir};`);
    process.env.LOG_INFO === 'true' && console.log(`Found: ${result.length} files`);

    return result;
  }

  private async scanDir(dirPath: string): Promise<ScannedItem[]> {
    const entriesPaths = await readdir(resolve(this.rootDir, dirPath));
    return Promise.all(
      entriesPaths.map(async (filePath) => {
        const data = await stat(resolve(this.rootDir, dirPath, filePath));
        return {
          fullPath: resolve(this.rootDir, dirPath, filePath),
          isDir: data.isDirectory(),
          isFile: data.isFile(),
        };
      }),
    );
  }
}
