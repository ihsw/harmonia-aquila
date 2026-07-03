#!/usr/bin/env node

import { program } from "commander";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

program
  .name("harmonia-aquila")
  .description("List files in a directory")
  .requiredOption("--dir-name <dirName>", "directory to list")
  .action(async (options: { dirName: string }) => {
    const targetDirectory = resolve(options.dirName);
    const directoryStats = await stat(targetDirectory);

    if (!directoryStats.isDirectory()) {
      program.error(`"${options.dirName}" is not a directory`);
    }

    const files = await readdir(targetDirectory, { withFileTypes: true });
    const invalidFiles = files.filter(
      file => !file.isFile() || !file.name.toLowerCase().endsWith(".mp3"),
    );

    if (invalidFiles.length > 0) {
      program.error(
        `"${options.dirName}" must contain only MP3 files. Invalid entries: ${invalidFiles
          .map(file => file.name)
          .join(", ")}`,
      );
    }

    for (const file of files) {
      console.info(file.name);
    }
  });

await program.parseAsync();
