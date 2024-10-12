// Listen for new Shorts being loaded
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const addedNodes = mutation.addedNodes;
        for (let node of addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('reel-video-in-sequence')) {   
            console.log("Analyzed Short", node)
            analyzeShort(node);         
          }
        }
      }
    });
});
  
  // Observe the body, as the #shorts-container might not exist immediately
observer.observe(document.body, { childList: true, subtree: true });
  
function extractHashtags(shortElement) {
    const descriptionElement = shortElement.querySelector('#description-text');
    if (!descriptionElement) return [];
  
    const text = descriptionElement.textContent;
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.slice(1)); // Remove the # symbol
}
  
function analyzeShort(shortElement) {
    const hashtags = extractHashtags(shortElement);
    
    console.log('Extracted hashtags:', hashtags);

    if (hashtags.length === 0) {
      console.log('No hashtags found');
      displayOverlay(shortElement, 'Unknown', 'unknown');
      return;
    }
  
    chrome.runtime.sendMessage({
      action: 'analyzeHashtags',
      data: { hashtags }
    }, (response) => {
      console.log('Received response from background script:', response);
      if (response && response.category && response.suitability) {
        displayOverlay(shortElement, response.category, response.suitability);
      } else {
        console.error('Invalid response from background script:', response);
        displayOverlay(shortElement, 'Error', 'unknown');
      }
    });
}
  
function displayOverlay(shortElement, category, suitability) {
    // Remove any existing overlay
    const existingOverlay = shortElement.querySelector('.ai-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
  
    const overlay = document.createElement('div');
    overlay.classList.add('ai-overlay');
    
    let color, text;
    switch (suitability.toLowerCase()) {
      case 'mature':
        color = 'rgba(255, 0, 0, 0.7)';
        text = 'Mature Audience Only';
        break;
      case 'pg13':
        color = 'rgba(255, 255, 0, 0.7)';
        text = 'PG-13 Content';
        break;
      case 'safe':
        color = 'rgba(0, 255, 0, 0.7)';
        text = 'Safe for All Audiences';
        break;
      default:
        color = 'rgba(128, 128, 128, 0.7)';
        text = 'Unknown Suitability';
    }
  
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${color};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      font-weight: bold;
      text-align: center;
      z-index: 1000;
      pointer-events: none;
    `;
  
    overlay.innerHTML = `
      <p style="font-size: 18px; margin: 5px;">${text}</p>
      <p style="font-size: 14px; margin: 5px;">Category: ${category}</p>
    `;
  
    shortElement.style.position = 'relative';
    shortElement.appendChild(overlay);
}
  
  // Log when the script has loaded
console.log('YouTube Shorts Content Analyzer script loaded');