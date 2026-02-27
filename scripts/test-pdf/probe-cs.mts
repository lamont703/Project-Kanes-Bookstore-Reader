import * as mupdf from 'mupdf';

async function main() {
    console.log("--- mupdf.ColorSpace ---");
    console.log(Object.keys(mupdf.ColorSpace));
    try {
        console.log("DeviceRGB:", mupdf.ColorSpace.DeviceRGB);
    } catch (e) {
        console.log("DeviceRGB access failed");
    }
}

main();
