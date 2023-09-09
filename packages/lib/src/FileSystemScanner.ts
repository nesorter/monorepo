import { readdir, stat } from 'fs/promises';
import { resolve } from 'path';

export type ScannedItem = {
  isFile: boolean;
  isDir: boolean;
  fullPath: string;
}

export class FileSystemScanner {
  rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async scan(nextDir: string = this.rootDir) {
    let result: ScannedItem[] = [];
    const dirEntries = await this.scanDir(nextDir);

    const files = dirEntries.filter(_ => _.isFile);
    const dirs = dirEntries.filter(_ => _.isDir);
    for (let dir of dirs) {
      result = [...result, ...(await this.scan(dir.fullPath))];
    }

    return [...files, ...result].filter(_ => _.fullPath.endsWith('.mp3'));
  }

  async scanDir(dirPath: string): Promise<ScannedItem[]> {
    const entriesPaths = await readdir(resolve(this.rootDir, dirPath));
    const entries = await Promise.all(
      entriesPaths.map(async (filePath) => {
        const data = await stat(resolve(this.rootDir, dirPath, filePath));
        return {
          isFile: data.isFile(),
          isDir: data.isDirectory(),
          fullPath: resolve(this.rootDir, dirPath, filePath),
        };
      }),
    );

    return entries;
  }
}
