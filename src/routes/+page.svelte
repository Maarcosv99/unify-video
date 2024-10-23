<script lang="ts">
	import { enhance } from '$app/forms';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { UploadIcon, Loader2Icon, CheckIcon } from 'lucide-svelte';
	
	import { confetti } from '@neoconfetti/svelte';

	type Status = 'convert.ready' | 'convert.start' | 'convert.error' | 'convert.done';

	let formElement = $state<HTMLFormElement>();
	let fileInput = $state<HTMLInputElement>();

	let status = $state<Status>($page.form ? 'convert.start' : 'convert.ready');
	let error = $state<string>('');
	
	function onFileChange(event: Event) {
		const target = event.target as unknown as { files: File[] };
		if (target && target.files.length > 1) {
			error = 'Upload one file';
		} else {
			error = '';
			formElement?.submit();
			status = 'convert.start';
		}
	}

	$effect(() => {
		if ($page.form && $page.form.fileId) {
			downloadVideo($page.form.fileId)
			status = 'convert.done';
			setTimeout(() => {
				status = 'convert.ready';
				error = '';
			}, 3 * 1000);
		}

		if ($page.status === 400 && $page.form.success === false) {
			status = 'convert.error';
			error = 'Error during video unify';

			setTimeout(() => {
				status = 'convert.ready';
				error = '';
			}, 5 * 1000);
		}
	});

	function downloadVideo(fileId: string) {
		const a = document.createElement('a');
		const fileName = `${fileId}.mp4`;
		a.href = '/output/' + fileName;
		a.download = fileName;
		setTimeout(() => a.click(), 1000);
	}
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
			{#if status === 'convert.ready'}
				<form
					method="post"
					action="/"
					use:enhance
					enctype="multipart/form-data"
					bind:this={formElement}
				>
					<div
						in:fade
						class="w-full h-full flex flex-col items-center justify-center gap-y-4"
						data-state={status}
						role="presentation"
					>
							<UploadIcon class="h-8 w-8 stroke-slate-600" />
							<span in:fade class="text-center">Arraste o arquivo, ou</span>
							<Button type="button" onclick={() => fileInput?.click()} variant="outline">Selecione o arquivo</Button>
							<input
								name="file"
								bind:this={fileInput}
								onchange={onFileChange}	
								type="file"
								hidden
								accept="video/mp4"
							/>
							<span class="text-xs text-red-400">{error}</span>
					</div>
				</form>
			{:else if status === 'convert.start'}
				<Loader2Icon class="w-10 h-10 animate-spin" />
			{:else if status === 'convert.done'}
				<div use:confetti></div>
				<CheckIcon class="w-10 h-10" />
			{:else}
				<p>{error}</p>
			{/if}
		</Card>
	</div>
</div>
