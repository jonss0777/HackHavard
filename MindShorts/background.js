// Replace 'your-api-key-here' with your actual OpenAI API key
const OPENAI_API_KEY = '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';
const YOUTUBE_API_KEY = 'AIzaSyC_IiDxZkMVt8viWdCp0ZPXNr58LPSSjD4';

const cache = new Map();

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    if (request.action === 'analyzeVideo') {
      console.log('Background script received analyzeVideo request:', request);
      const cacheKey = request.videoId;
      if (cache.has(cacheKey)) {
        console.log('Using cached result');
        sendResponse(cache.get(cacheKey));
      } else {
        analyzeWithOpenAI(request.hashtags)
          .then(result => {
            console.log('Analysis result:', result);
            cache.set(cacheKey, result);
            sendResponse(result);
          })
          .catch(error => {
            console.error('Analysis error:', error);
            sendResponse({ error: 'Analysis failed', category: 'Error', suitability: 'unknown', hashtags: request.hashtags });
          });
      }
      return true; // Indicates we'll respond asynchronously
    }
});

async function getVideoDetails(videoId) {
  console.log('Fetching video details for:', videoId);
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  const description = data.items[0].snippet.description;
  const hashtags = description.match(/#\w+/g) || [];
  return hashtags.map(tag => tag.slice(1));
}

async function analyzeWithOpenAI(hashtags) {
  console.log('Analyzing hashtags with OpenAI:', hashtags);
  const prompt = `Analyze these YouTube Short hashtags and determine the video's category and age suitability: ${hashtags.join(', ')}. Respond in JSON format with "category" and "suitability" fields. Suitability should be one of: safe, pg13, or mature.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that analyzes YouTube video hashtags to determine the video's category and age suitability."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI API response:', data);

    const aiResponse = JSON.parse(data.choices[0].message.content);
    return {
      category: aiResponse.category,
      suitability: aiResponse.suitability,
      hashtags: hashtags
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}