import { TextSummarizeConfig } from "../configSchemas/textSummarize.schema.js";

// Common filler words to ignore while calculating word requencies,
// since they naturally dominate paragraphs in the English language; frequency-wise.
const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "but", "if", "then", "of", "to", "in", "on", "for", "with",
    "is", "are", "was", "we", "were", "be", "been", "being", "this", "that", "these", "those",
    "it", "its", "as", "at", "by", "from", "about", "into", "over", "after", "before"
]);

function splitSentences(text: string) {
    // Break text into sentences using punctuation
    return text
        .replace(/\n/g, " ")
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(Boolean);
};

function tokenize(text: string) {
    return text
        .toLowerCase() // convert text to lowercase
        .replace(/[^\w\s]/g, "") //remove punctuation (non-alphanumeric symbols)
        .split(/\s+/) // split into words by whitespace (via regex to avoid empty words via redundant spaces)
        .filter(Boolean); // ensure no empty strings by cleaning them if any existed
};

function wordFrequency(words: string[]) {
    // build a frequency map of words, skipping stopwords.
    const freq: Record<string, number> = {};

    for (const word of words) {
        if (STOPWORDS.has(word)) continue;

        freq[word] = (freq[word] || 0) + 1;
    }

    return freq;
};

function scoreSentence(sentence: string, freq: Record<string, number>) {
    // tokenize each sentence in the split sentences array
    const words = tokenize(sentence);

    let score = 0;
    // add up the frequency scores of its words
    for (const w of words) {
        if (freq[w]) score += freq[w]
    } // sentences containing more frequent words get higher scores

    return score;
};

// picks keywords; top(per count) words.
function topKeywords(freq: Record<string, number>, count: number) {
    return Object.entries(freq) // pair lists array [[word,frequency],..]
        .sort((a, b) => b[1] - a[1]) // sort by the second element (freqency)
        .slice(0, count) // limits with count, to get top N keywords
        .map(([word]) => word); // destructures to just the first input, disgarding the count
    //thus returning a simple array of top N keywords :)
};

// the processor:
export async function textSummarizeProcessor(
    payload: Record<string, unknown>,
    config: TextSummarizeConfig
) {

    const text = payload[config.inputField];

    if (typeof text !== "string") {
        throw new Error(`Field "${config.inputField}" must be a string`)
    } // ensure we're summarizing a text field

    // split into sentences via punctuation
    const sentences = splitSentences(text);

    // tokenize the whole paragraph into words (disregarding stopwords)
    const words = tokenize(text);

    // make a "freq" record of each word and its frequency
    const freq = wordFrequency(words);

    // score sentences via the frequency of each's words
    const scored = sentences.map(s => ({
        sentence: s,
        score: scoreSentence(s, freq)
    }));

    // pick top sentences for summary
    const summarySentences = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, config.maxSentences)
        .map(s => s.sentence);

    // extract top keywords
    const keywords = topKeywords(freq, config.keywordCount);

    // Output; an object containing
    return {
        ...payload,
        original: {
            bodyLength: text.length
        }, // length of the summarized text field

        summary: summarySentences.join(". ") + ".",

        keywords,

        wordCount: words.length,

        sentenceCount: sentences.length
    }
};