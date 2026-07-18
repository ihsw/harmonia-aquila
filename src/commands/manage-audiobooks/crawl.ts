import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import {
  type CrawlAudiobookJsonOutput,
  type CrawlAudiobookOptions,
  crawlAudiobooks,
} from '../../lib/audiobooks/crawl.js'
import { UserInputError } from '../../lib/errors.js'

export type { CrawlAudiobookJsonOutput, CrawlAudiobookJsonOutputRow } from '../../lib/audiobooks/crawl.js'

export function registerCrawlAudiobooksCommand(program: Command): void {
  const crawlAudiobooksCommand = program
    .command('crawl')
    .description('Recursively categorize M4B files by metadata and filename validity')
    .requiredOption('--dir-name <dirName>', 'directory to crawl for M4B files')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: CrawlAudiobookOptions & { format?: string }) => {
      const outputFormat = parseOutputFormat(crawlAudiobooksCommand, options.format)
      let rows: CrawlAudiobookJsonOutput

      try {
        rows = await crawlAudiobooks(options)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          crawlAudiobooksCommand.error(error.message)
        }

        throw error
      }

      writeRows(outputFormat, rows)
    })
}
