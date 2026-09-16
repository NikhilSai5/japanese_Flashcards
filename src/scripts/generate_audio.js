/* eslint-env node */
import { createClient } from '@supabase/supabase-js';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials in .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const TEMP_DIR = path.join(process.cwd(), 'temp_audio');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processAudioGeneration() {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    console.log('Fetching flashcards...');

    const { data: cards, error } = await supabase
        .from('flashcards')
        .select('id, jp, lesson, audio_url');

    if (error) {
        console.error('Database fetch error:', error.message);
        return;
    }

    if (!cards || cards.length === 0) {
        console.log('No cards found in the database.');
        return;
    }

    console.log(`Total cards fetched: ${cards.length}`);

    // Initialize Edge TTS engine
    const tts = new MsEdgeTTS();
    await tts.setMetadata('ja-JP-NanamiNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];

        // SKIP check: process only if audio_url does not exist
        if (card.audio_url && card.audio_url.trim() !== '') {
            console.log(`[${i + 1}/${cards.length}] Skipping ID ${card.id}: audio_url already exists.`);
            continue;
        }

        const fileName = `lesson_${card.lesson}_card_${card.id}.mp3`;
        const filePath = path.join(TEMP_DIR, fileName);

        console.log(`[${i + 1}/${cards.length}] Generating audio for ID ${card.id}: ${card.jp}`);

        try {
            // 1. Synthesize Audio
            const result = await tts.toFile(TEMP_DIR, card.jp);
            const audioFilePath = result.audioFilePath;

            // 2. Upload MP3 to Supabase Storage
            const fileBuffer = fs.readFileSync(audioFilePath);
            const { error: uploadError } = await supabase.storage
                .from('pronunciations')
                .upload(fileName, fileBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true,
                });

            if (uploadError) {
                console.error(`  ↳ Storage Upload Failed:`, uploadError.message);
                continue;
            }

            // 3. Retrieve Public URL
            const { data: urlData } = supabase.storage
                .from('pronunciations')
                .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;

            // 4. Update DB Record
            const { error: updateError } = await supabase
                .from('flashcards')
                .update({ audio_url: publicUrl })
                .eq('id', card.id);

            if (updateError) {
                console.error(`  ↳ DB Update Failed:`, updateError.message);
            } else {
                console.log(`  ↳ Success! Updated audio_url.`);
            }

            // 5. Cleanup temp file
            if (fs.existsSync(audioFilePath)) {
                fs.unlinkSync(audioFilePath);
            }

            // 6. 300ms Delay to avoid rate-limiting
            await delay(300);

        } catch (err) {
            console.error(`  ↳ Error processing card ${card.id}:`, err.message);
        }
    }

    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    console.log('\nProcessing complete!');
}

processAudioGeneration();