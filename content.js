// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProductInfo") {
    // Get product information from the page
    const productTitle = document.getElementById('productTitle')?.textContent.trim();
    const productUrl = window.location.href;
    
    sendResponse({
      title: productTitle,
      url: productUrl
    });
  }
  return true;
}); 