let lastAnalyzedVideoId = '';
let analysisTimeout = null;
const API_KEY = 'AIzaSyC_IiDxZkMVt8viWdCp0ZPXNr58LPSSjD4';

function extractVideoId(url) {
  const match = url.match(/\/shorts\/([^/?]+)/);
  return match ? match[1] : null;
}

function debounce(func, wait) {
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(analysisTimeout);
      func(...args);
    };
    clearTimeout(analysisTimeout);
    analysisTimeout = setTimeout(later, wait);
  };
}

function extractHashtags(description) {
  const hashtagRegex = /#\w+/g;
  return description.match(hashtagRegex) || [];
}

async function getVideoMetadata(videoId) {
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const videoSnippet = data.items[0].snippet;
      const description = videoSnippet.description || "";
      const hashtags = extractHashtags(description);

      return {
        title: videoSnippet.title,
        description: description,
        hashtags: hashtags
      };
    } else {
      return null;  // No video found with this ID
    }
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return null;
  }
}

const analyzeCurrentShort = debounce(async () => {
  const videoId = extractVideoId(window.location.href);

  if (!videoId || videoId === lastAnalyzedVideoId) {
    console.log('Video unchanged or invalid, skipping analysis');
    return;
  }

  console.log('Analyzing video:', videoId);
  lastAnalyzedVideoId = videoId;

  const metadata = await getVideoMetadata(videoId);
  if (metadata) {
    console.log("Title:", metadata.title);
    console.log("Description:", metadata.description);
    console.log("Hashtags:", metadata.hashtags);

    chrome.runtime.sendMessage({
      action: 'analyzeVideo',
      videoId: videoId,
      hashtags: metadata.hashtags
    }, response => {
      if (response && response.category && response.suitability) {
        displayOverlay(response.category, response.suitability, metadata.hashtags);
      } else {
        displayOverlay('Error', 'unknown', metadata.hashtags);
      }
    });
  } else {
    console.log("No video metadata found for this ID.");
    displayOverlay('Error', 'unknown', []);
  }
}, 1000); // 1 second debounce

function displayOverlay(category, suitability, hashtags) {
  console.log('Displaying overlay:', { category, suitability, hashtags });
  const overlayId = 'ai-analysis-overlay';
  let overlay = document.getElementById(overlayId);
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = overlayId;
    document.body.appendChild(overlay);
  }

  let color;
  switch (suitability.toLowerCase()) {
    case 'mature': color = 'linear-gradient(to bottom, rgba(255, 0, 0, 0.7), transparent)'; break;
    case 'pg13': color = 'linear-gradient(to bottom, rgba(255, 255, 0, 0.7), transparent)'; break;
    case 'safe': color = 'linear-gradient(to bottom, rgba(0, 255, 0, 0.7), transparent)'; break;
    default: color = 'linear-gradient(to bottom, rgba(128, 128, 128, 0.7), transparent)';
  }

  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 100px;
    background: ${color};
    color: white;
    padding: 10px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    font-size: 14px;
    text-align: left;
  `;

  overlay.innerHTML = `
    <p style="margin: 0 0 5px 0; font-weight: bold;">Suitability: ${suitability}</p>
    <p style="margin: 0 0 5px 0;">Category: ${category}</p>
    <p style="margin: 0;">Tags: ${hashtags.join(', ') || 'None'}</p>
  `;
}

function isYouTubeShort() {
  return window.location.pathname.startsWith('/shorts/');
}

const observer = new MutationObserver(debounce(() => {
  if (isYouTubeShort()) {
    console.log('YouTube Short detected');
    analyzeCurrentShort();
  }
}, 500)); // 500ms debounce

observer.observe(document.body, { childList: true, subtree: true });

console.log('YouTube Shorts Content Analyzer script loaded');
/*function extractHashtags(shortElement) {
    console.log('Attempting to extract hashtags from:', shortElement);
  
    const potentialSelectors = [
      '#description-text', 
      '#content-text', 
      '[id^="description-"]',
      '.ytd-reel-player-overlay-renderer #text',
      '.metadata-wrapper #content-text',
      '#video-title',
      '.ytd-video-meta-block',
      '.ytd-reel-player-overlay-renderer'
    ];
  
    let text = '';
    for (const selector of potentialSelectors) {
      const element = shortElement.querySelector(selector);
      if (element) {
        text += element.textContent + '';
      }
    }
  
    console.log('Extracted text:', text);
  
    const hashtags = text.match(/#\w+/g) || [];
    console.log('Extracted hashtags:', hashtags);
  
    return hashtags.map(tag => tag.slice(1)); // Remove the # symbol
}
  
function analyzeShort(shortElement) {
    console.log('Analyzing Short:', shortElement);
    const hashtags = extractHashtags(shortElement);
    
    if (hashtags.length === 0) {
      console.log('No hashtags found. Trying to extract any text.');
      const allText = shortElement.textContent;
      console.log('All text in Short:', allText);
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
    console.log('Overlay displayed for:', category, suitability);
}
  
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const addedNodes = mutation.addedNodes;
        for (let node of addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            console.log('New node added:', node);

            const shortElement = node.querySelector('#shorts-container ytd-reel-video-renderer') ||
                                 node.querySelector('ytd-reel-video-renderer') ||
                                 (node.tagName === 'YTD-REEL-VIDEO-RENDERER' ? node : null);

            if (shortElement) {
                console.log('Found a Short: ', shortElement);
                analyzeShort(shortElement);
            /*
            if (node.classList.contains('reel-video-in-sequence') || node.querySelector('.reel-video-in-sequence')) {
              console.log('Found a Short:', node);
              analyzeShort(node);
              */
/*
            }
          }
        }
      }
    });
});
*/
/*
observer.observe(document, { childList: true, subtree: true });

// Also analyze existing Shorts on the page when the script loads
function analyzeExistingShorts() {
    const existingShorts = document.querySelectorAll('#shorts-container ytd-reel-video-renderer, ytd-reel-video-renderer');
    console.log('Existing Shorts found:', existingShorts.length);
    existingShorts.forEach(short => analyzeShort(short));
}
  
  // Run initial analysis after a short delay to ensure the page has loaded
setTimeout(analyzeExistingShorts, 2000);
  
console.log('YouTube Shorts Content Analyzer script loaded');
*/