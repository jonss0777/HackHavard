chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeHashtags') {
      console.log('Received hashtags for analysis:', request.data.hashtags);
      analyzeWithOpenAI(request.data.hashtags)
        .then(result => {
          console.log('OpenAI analysis result:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('OpenAI analysis error:', error);
          sendResponse({ error: 'Analysis failed' });
        });
      return true; // Indicates we'll respond asynchronously
    }
});
  
async function analyzeWithOpenAI(hashtags) {
    const prompt = `Analyze the following YouTube video hashtags and determine the video's category and age suitability: ${hashtags.join(', ')}. Respond in JSON format with "category" and "suitability" fields. Suitability should be one of: "safe", "pg13", or "mature".`;
  
    console.log('Sending prompt to OpenAI:', prompt);
  
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{role: "user", content: prompt}],
          temperature: 0.7
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      console.log('Raw OpenAI response:', result);
      const content = result.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
}