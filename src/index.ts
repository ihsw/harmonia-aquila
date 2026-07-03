#!/usr/bin/env node

import { program } from "commander";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

program
  .name("harmonia-aquila")
  .description("List files in a directory")
  .argument("[directory]", "directory to list", ".")
  .action(async (directory: string) => {
    const targetDirectory = resolve(directory);
    const directoryStats = await stat(targetDirectory);

    if (!directoryStats.isDirectory()) {
      program.error(`"${directory}" is not a directory`);
    }

    const files = await readdir(targetDirectory);

    for (const file of files) {
      console.log(file);
    }
  });

await program.parseAsync();


