const fs = require('fs');
const path = require('path');

const pages = [
    {
        num: 1,
        title: "Chapter 1: The Awakening",
        lines: [
            "The stars had always called to her. Even as a child,",
            "Zara would spend countless nights on the observation",
            "deck of the colony ship, watching the cosmos drift by",
            "in an endless tapestry of light and shadow.",
            "",
            "Her parents had been among the first to sign up for",
            "the Great Migration, leaving Earth behind for the",
            "promise of new worlds. She couldn't remember much",
            "of the old planet—just fragments of blue skies and",
            "the scent of rain. Everything else was metal corridors",
            "and recycled air.",
        ]
    },
    {
        num: 2,
        lines: [
            "Tonight was different. The ship's AI had detected",
            "something unusual—a signal, faint but unmistakable,",
            "emanating from a nearby nebula. It was the first sign",
            "of intelligent life they'd encountered in three years",
            "of travel through the void.",
            "",
            "Captain Morrison had called an emergency meeting of",
            "the senior crew. Zara, despite being only twenty-three,",
            "had earned her place among them through her exceptional",
            "skill in xenolinguistics. If this signal was a message,",
            "she would be the one to decode it.",
        ]
    },
    {
        num: 3,
        lines: [
            "As she made her way through the dimly lit corridors,",
            "her mind raced with possibilities. What kind of",
            "civilization could survive in the harsh radiation of",
            "a nebula? What would they have to say to a lost ship",
            "of human refugees?",
            "",
            "The conference room was already buzzing with activity",
            "when she arrived. Holographic displays showed the",
            "signal's waveform—complex, rhythmic, almost musical.",
            "It was nothing like any human language, but there was",
            "an unmistakable pattern to it.",
        ]
    },
    {
        num: 4,
        lines: [
            "Morrison's weathered face looked more tired than usual.",
            "The weight of eight thousand souls pressed down on his",
            "shoulders daily. 'Dr. Nebula,' he said, using her",
            "nickname, 'can you make sense of this?'",
            "",
            "Zara stepped forward, her fingers dancing across the",
            "holographic interface. The signal responded, shifting",
            "and adapting to her inputs. It was alive, intelligent,",
            "and it was trying to communicate.",
        ]
    },
    {
        num: 5,
        lines: [
            "'It's not just a signal,' she breathed. 'It's a",
            "greeting. And they've been waiting for us.'",
            "",
            "The room fell silent. For the first time in three",
            "years, there was something more than empty space",
            "ahead of them. Something that changed everything",
            "they thought they knew about the universe.",
        ]
    },
    {
        num: 6,
        title: "Chapter 2: First Contact",
        lines: [
            "The ship altered course, diving deeper into the",
            "nebula's glowing embrace. Outside the viewports,",
            "violet and blue clouds swirled in patterns that",
            "seemed almost deliberate, as if the nebula itself",
            "was alive.",
            "",
            "Zara hadn't slept in thirty-six hours. The signal",
            "had become her obsession, its patterns weaving through",
            "her dreams even in the brief moments she closed",
            "her eyes.",
        ]
    },
    {
        num: 7,
        lines: [
            "She'd discovered something remarkable—the message",
            "wasn't just a greeting, it was an invitation.",
            "",
            "The beings called themselves the Luminari, children",
            "of the nebula, born from the energy storms that",
            "raged within. They had no physical form as humans",
            "understood it, existing as patterns of electromagnetic",
            "radiation and thought.",
        ]
    },
    {
        num: 8,
        lines: [
            "Communication was slow, painstaking. Each exchange",
            "took hours as Zara worked to bridge the gap between",
            "human language and pure energy. But gradually, a",
            "picture emerged of a civilization older than humanity",
            "by countless millennia.",
        ]
    },
    {
        num: 9,
        lines: [
            "The Luminari had watched civilizations rise and fall",
            "across the galaxy, never interfering, always observing.",
            "But something about humanity had caught their",
            "attention—perhaps it was our music, they suggested,",
            "or our stories.",
        ]
    },
    {
        num: 10,
        lines: [
            "The way we carried culture across the stars even",
            "as refugees. They saw in humanity not just survivors,",
            "but storytellers—and that, they said, was the rarest",
            "thing in the universe.",
            "",
            "",
            "                    — END OF PREVIEW —",
        ]
    },
];

const outputDir = path.join(__dirname, '..', 'public', 'mock-pages');

for (const page of pages) {
    const textLines = [];

    // Page header
    if (page.title) {
        textLines.push(`<text x="50%" y="80" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#e8e2d6">${page.title}</text>`);
    }

    const startY = page.title ? 140 : 100;
    for (let i = 0; i < page.lines.length; i++) {
        const line = page.lines[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
        textLines.push(`<text x="60" y="${startY + i * 32}" font-family="Georgia, serif" font-size="18" fill="#d4cec2">${line}</text>`);
    }

    // Page number at bottom
    textLines.push(`<text x="50%" y="570" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#8a8070">— ${page.num} —</text>`);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs>
    <linearGradient id="pageBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1814"/>
      <stop offset="100%" stop-color="#141210"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#pageBg)" rx="4"/>
  <rect x="30" y="30" width="540" height="740" fill="none" stroke="#3a3530" stroke-width="1" rx="2"/>
  ${textLines.join('\n  ')}
</svg>`;

    const filePath = path.join(outputDir, `page-${page.num}.svg`);
    fs.writeFileSync(filePath, svg);
    console.log(`Generated: ${filePath}`);
}

console.log(`\nDone! Generated ${pages.length} mock page files.`);
