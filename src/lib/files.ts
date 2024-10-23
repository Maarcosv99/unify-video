export function readFromBlobOrFile(blob: Blob | File): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const fileReader = new FileReader();
		fileReader.onload = () => {
			const { result } = fileReader;
			if (result instanceof ArrayBuffer) {
				resolve(new Uint8Array(result));
			} else {
				resolve(new Uint8Array());
			}
		};

		fileReader.onerror = (event) => {
			reject(
				Error(
					`File could not be read! Code=${event?.target?.error?.code || -1}`
				)
			);
		};

		fileReader.readAsArrayBuffer(blob);
	});
}
