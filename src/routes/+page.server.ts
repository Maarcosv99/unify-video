import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs/promises';

export const actions = {
	default: async ({ request }) => {
		const formData = Object.fromEntries(await request.formData());
		if (!formData['file']) return fail(400);
		const { file: inputFile } = formData as { file: File };
	
		const getRandomValue = (min: number, max: number, precision: number = 2): number => {
			return parseFloat((Math.random() * (max - min) + min).toFixed(precision));
		}

		const unifyFile = async (file: File, videoId: string): Promise<void> => {
			// Adjust color and volume
			const hueSaturation = getRandomValue(0.9, 1.10);
			const hueBrightness = getRandomValue(0.98, 1.02);
			const timeAdjustment = getRandomValue(-0.05, 0.05);
			const volumeAdjustment = getRandomValue(0.95, 1.05);

			// Adjust file size
			const crf = getRandomValue(18, 28);
			const audioBitrate = getRandomValue(128, 320);
			const scaleFactor = getRandomValue(0.75, 1.25);
			const frameRate = getRandomValue(20, 60);
			
			const fileName = `${videoId}.mp4`;
			const inputPath = `static/input/${fileName}`;
			const outputPath = `static/output/${fileName}`;
				
			await fs.writeFile(inputPath,Buffer.from(await file.arrayBuffer()));
			
			return new Promise((resolve, reject) => {
				ffmpeg(inputPath)
					.videoCodec('libx264')
					.videoBitrate('1000k')
					.audioBitrate(audioBitrate)
					.audioFilters([`volume=${volumeAdjustment}`])
					.videoFilters([
						`setpts=PTS+${timeAdjustment}/TB`,
						`hue=s=${hueSaturation}:b=${hueBrightness}`,
						`scale=ceil(iw*${scaleFactor}):ceil(ih*${scaleFactor})`,
						`fps=${frameRate}`,
					])
					.outputOptions([
						'-pix_fmt yuv420p',
						'-map_metadata -1',    // Remove os metadados
						`-crf ${crf}`          // Ajusta a taxa de compressão
					])
					.on('end', () => resolve())
					.on('error', (error) => reject(error))
					.on('progress', (progress) => console.log(`${progress.percent || 0}%`))
					.output(outputPath)
					.run();
			});
		};
		
		try {
			const fileId = crypto.randomUUID();
			await unifyFile(inputFile, fileId);
			return { success: true, fileId };
		} catch (err) {
			console.log(`Error: ${(err as Error).message}`);
			return fail(400, { success:false });
		}
	},
} satisfies Actions;
