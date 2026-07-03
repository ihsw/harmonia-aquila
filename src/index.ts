#!/usr/bin/env node

import { program } from "commander";
import { parseFile } from "music-metadata";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import pLimit from "p-limit";

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
  .description("Analyze local music files");

const summarizeSourceDirCommand = program
  .command("summarize-source-dir")
  .description("List MP3 files and metadata in a source directory")
  .requiredOption("--dir-name <dirName>", "directory to list")
  .option("--limit <count>", "maximum number of files to list")
  .action(async (options: { dirName: string; limit?: string }) => {
    const targetDirectory = resolve(options.dirName);
    const directoryStats = await stat(targetDirectory);

    if (!directoryStats.isDirectory()) {
      summarizeSourceDirCommand.error(`"${options.dirName}" is not a directory`);
    }

    const files = await readdir(targetDirectory, { withFileTypes: true });
    const invalidFiles = files.filter(
      file => !file.isFile() || !file.name.toLowerCase().endsWith(".mp3"),
    );

    if (invalidFiles.length > 0) {
      summarizeSourceDirCommand.error(
        `"${options.dirName}" must contain only MP3 files. Invalid entries: ${invalidFiles
          .map(file => file.name)
          .join(", ")}`,
      );
    }

    const limit = options.limit === undefined ? undefined : Number(options.limit);

    if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
      summarizeSourceDirCommand.error("--limit must be a non-negative integer");
    }

    const filesToSummarize = limit === undefined ? files : files.slice(0, limit);
    const parseMetadata = pLimit(16);
    const metadataRows = await Promise.all(
      filesToSummarize.map(file => parseMetadata(async (): Promise<Mp3MetadataRow> => {
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
      })),
    );

    console.table(metadataRows);
  });

await program.parseAsync();
