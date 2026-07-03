#!/usr/bin/env node

import { program } from "commander";
import { parseFile } from "music-metadata";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

interface Mp3MetadataRow {
  album: string;
  artist: string;
  bitrate: number | string;
  duration: number | string;
  filename: string;
  sampleRate: number | string;
  title: string;
  year: number | string;
}

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

    const metadataRows = await Promise.all(
      files.map(async (file): Promise<Mp3MetadataRow> => {
        const metadata = await parseFile(resolve(targetDirectory, file.name));

        return {
          album: metadata.common.album ?? "",
          artist: metadata.common.artist ?? "",
          bitrate: metadata.format.bitrate ?? "",
          duration: metadata.format.duration ?? "",
          filename: file.name,
          sampleRate: metadata.format.sampleRate ?? "",
          title: metadata.common.title ?? "",
          year: metadata.common.year ?? "",
        };
      }),
    );

    console.table(metadataRows);
  });

await program.parseAsync();
