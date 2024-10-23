<script lang="ts">
	import { fade } from 'svelte/transition';
	import { tweened } from 'svelte/motion';
	import { confetti } from '@neoconfetti/svelte';

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { UploadIcon, Loader2Icon } from 'lucide-svelte';

	import { FFmpeg } from '@ffmpeg/ffmpeg';
	import { readFromBlobOrFile } from '$lib/files';

	type Status = 'loading' | 'loaded' | 'convert.start' | 'convert.error' | 'convert.done';
	
	let fileInput = $state<HTMLInputElement>();
	let status = $state<Status>('loading');
	let error = $state<string>('');

	let ffmpeg: FFmpeg;
	let progress  = tweened(0);

	async function loadFFmpeg() {
		const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.1/dist/esm';
		
		ffmpeg = new FFmpeg();
	
		ffmpeg.on('progress', (event) => {
			$progress = event.progress * 100;
		});

		await ffmpeg.load({
			coreURL: `${baseURL}/ffmpeg-core.js`,
			wasmURL: `${baseURL}/ffmpeg-core.wasm`,
		});

		status = 'loaded';
	}

	$effect(() => {
		if (status === 'loading') loadFFmpeg()
	});

	function onFileChange(event: Event) {
		const target = event.target as unknown as { files: File[] };
		if (target && target.files.length > 1) {
			error = 'Upload one file';
		} else {
			error = '';
			const [file] = target.files;
			unifyFile(file).then((data) => {
				if (data) downloadVideo(data);
			});
		}
	}

	async function downloadVideo(data: Uint8Array) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
		a.download = `${crypto.randomUUID()}.mp4`;
		setTimeout(() => a.click(), 1000);
	}

	function getRandomValue(min: number, max: number, precision: number = 2): number {
		return parseFloat((Math.random() * (max - min) + min).toFixed(precision));
	}

	async function unifyFile(file: File) {
		try {
			status = 'convert.start';
			const fileData = await readFromBlobOrFile(file);
			await ffmpeg.writeFile(file.name, fileData);
			
			const outputFilename = `${crypto.randomUUID()}.mp4`;

			const fetchMusic = await fetch('/background-music-01.mp3');
			const blobMusic = await fetchMusic.blob();
			const fileMusic = await readFromBlobOrFile(blobMusic);
			await ffmpeg.writeFile('backgroundMusic.mp3', fileMusic);
			
			// Random variables
			const hueSaturation = getRandomValue(0.9, 1.10);
			const hueBrightness = getRandomValue(0.98, 1.02);
			const timeAdjustment = getRandomValue(-0.05, 0.05);
			const crf = getRandomValue(18, 28);
			const audioBitrate = getRandomValue(128, 320);
			const scaleFactor = getRandomValue(0.75, 1.25);
			const frameRate = getRandomValue(20, 60);
			const musicVolume = getRandomValue(0.1, 1);

			await ffmpeg.exec([
				'-i', file.name,                     // Entrada de vídeo principal
				'-i', 'backgroundMusic.mp3',          // Entrada de música de fundo
				'-filter_complex', 
					`[0:v]setpts=PTS+${timeAdjustment}/TB,hue=s=${hueSaturation}:b=${hueBrightness},scale=trunc(iw*${scaleFactor}/2)*2:trunc(ih*${scaleFactor}/2)*2,fps=${frameRate}[v];` + // Filtros de vídeo (verificação de múltiplos de 2)
					`[1:a]volume=${musicVolume}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`,  // Filtros de áudio (mistura)
				'-map', '[v]',                        // Mapeia a saída de vídeo filtrado
				'-map', '[a]',                        // Mapeia a saída de áudio filtrado
				'-map_metadata', '-1',                // Remove metadados extras
				'-tune', 'zerolatency',               // Ajuste de latência
				'-preset', 'fast',                    // Definição de velocidade
				'-c:v', 'libx264',                    // Codec de vídeo
				'-crf', `${crf}`,                     // Ajuste de qualidade de vídeo
				'-pix_fmt', 'yuv420p',                // Formato de pixel
				'-c:a', 'aac',                        // Codec de áudio
				'-b:a', `${audioBitrate}k`,           // Taxa de bits de áudio
				outputFilename                        // Nome do arquivo de saída
			]);

			const data = await ffmpeg.readFile(outputFilename);
			status = 'convert.done';
			return data as Uint8Array;
		} catch (err) {
			error = (err as Error).message;
			status = 'convert.error';
		}
	}
	
	async function handleDrop(event: DragEvent) {
		if (!event.dataTransfer) return;

		if (event.dataTransfer.files.length > 1) {
			error = 'Upload one file';
		}

		if (event.dataTransfer.files[0].type === 'video/mp4') {
			error = '';
			const [file] = event.dataTransfer.files;
			const data = await unifyFile(file);
			if (data) {
				await downloadVideo(data);
			}
		}
	}
	
	$effect(() => {
		if (status === 'convert.done') {
			setTimeout(() => status = 'loaded', 3 * 1000);
		}
	});
</script>

<svelte:head>
	<title>Remove metadata</title>
</svelte:head>

<div class="w-full min-h-dvh flex items-center justify-center">
	<div class="w-[800px] space-y-3">
		<div>
			<h1 class="text-2xl text-bold">Criativo único</h1>
			<p class="text-sm text-muted-foreground">
				Faça o upload de seu criativo e vamos trasnformar ele em único, para
				que você possa continuar utilizando no Facebook.
			</p>
		</div>
		<Card class="w-full h-[400px] flex items-center justify-center">
			{#if status === 'loading'}
				<div in:fade class="flex flex-col items-center justify-center gap-y-5">
					<Loader2Icon class="w-10 h-10 animate-spin" />	
					<span class="text-muted-foreground text-center">
						Carregando script para<br/>conversão do vídeo.
					</span>
				</div>
			{:else}
				<div
					class="w-full h-full flex flex-col items-center justify-center gap-y-4"
					ondrop={handleDrop}
					data-state={status}
					role="presentation"
				>
					{#if status === 'convert.start'}
						<div in:fade class="flex flex-col items-center justify-center gap-y-5">
							<h2 class="text-xl font-bold">Unificando</h2>	
							<Progress value={$progress} />
						</div>
					{:else if status === 'convert.done'}
						<div use:confetti></div>
						<p in:fade>Done!</p>
					{:else if status === 'convert.error' || error}
						<p in:fade class="text-red-600">{error}</p>
					{:else}
						<UploadIcon class="h-8 w-8 stroke-slate-600" />
						<span in:fade class="text-center">Arraste o arquivo, ou</span>
						<Button type="button" on:click={() => fileInput?.click()} variant="outline">Selecione o arquivo</Button>
						<input
							name="file"
							bind:this={fileInput}
							onchange={onFileChange}	
							type="file"
							hidden
							accept="video/mp4"
						/> 
					{/if}
				</div>
			{/if}
		</Card>
	</div>
</div>
