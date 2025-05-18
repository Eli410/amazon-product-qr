document.addEventListener('DOMContentLoaded', function() {
  // Load saved PDF size
  chrome.storage.local.get(['pdfSize'], function(result) {
    const sizeSelect = document.getElementById('pdf-size');
    sizeSelect.value = result.pdfSize || '4x6';
  });

  // Save PDF size when changed
  document.getElementById('pdf-size').addEventListener('change', function(e) {
    const newSize = e.target.value;
    chrome.storage.local.set({ pdfSize: newSize });
  });

  // Get the active tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    
    // Check if we're on an Amazon product page
    if (activeTab.url.includes('amazon.com')) {
      // First, inject the content script manually to ensure it's loaded
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      }).then(() => {
        // Now send message to content script
        chrome.tabs.sendMessage(activeTab.id, {action: "getProductInfo"}, function(response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            document.getElementById('content').innerHTML = '<p>Error: Could not communicate with the page. Please refresh the page and try again.</p>';
            return;
          }
          
          if (response) {
            // Store product info for later use in PDF generation
            window.productInfo = response;
            
            // Handle the response from content script
            document.getElementById('content').innerHTML = `
              <div class="product-info">
                <div class="form-group">
                  <label for="product-title">Product Title:</label>
                  <textarea id="product-title" class="form-control" rows="4">${response.title}</textarea>
                </div>
                <div class="form-group">
                  <label for="product-price">Price:</label>
                  <input type="text" id="product-price" class="form-control" placeholder="Enter price" value="$">
                </div>
              </div>
            `;

            // Generate QR code using the QRCode.js library
            const qrcodeElement = document.getElementById('qrcode');
            qrcodeElement.innerHTML = ''; // Clear any existing QR code
            
            // Create new QR code with the product URL
            new QRCode(qrcodeElement, {
              text: response.url,
              width: 400,  // Back to 400 for high resolution
              height: 400, // Back to 400 for high resolution
              colorDark: "#000000",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.H,
              margin: 2,
              scale: 4  // Keep high scale for better resolution
            });

            // Add input event listener to price field to control button state
            const priceInput = document.getElementById('product-price');
            const printButton = document.getElementById('printButton');
            
            // Initial button state
            printButton.disabled = true;
            printButton.style.opacity = '0.5';
            
            priceInput.addEventListener('input', function() {
              const hasPrice = this.value.trim().length > 0;
              printButton.disabled = !hasPrice;
              printButton.style.opacity = hasPrice ? '1' : '0.5';
            });
          }
        });
      }).catch(err => {
        console.error('Error injecting content script:', err);
        document.getElementById('content').innerHTML = '<p>Error: Could not access the page. Please make sure you are on an Amazon product page.</p>';
      });
    } else {
      document.getElementById('content').innerHTML = '<p>Please navigate to an Amazon product page.</p>';
    }
  });

  // Add print button functionality
  document.getElementById('printButton').addEventListener('click', function() {
    if (!window.productInfo) {
      return;
    }
    
    // Update productInfo with the current values from the text boxes
    window.productInfo.title = document.getElementById('product-title').value;
    window.productInfo.price = document.getElementById('product-price').value;
    
    generateAndPrintPDF();
  });
  
  // Function to generate and print PDF
  function generateAndPrintPDF() {
    try {
      console.log("Starting PDF generation...");
      
      // Check if jsPDF is available and properly initialized
      if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
        console.error("jsPDF library not found or not properly initialized!");
        alert("Error: PDF generation library not loaded. Please try again.");
        return;
      }
      
      // Get selected size and convert to mm
      const selectedSize = document.getElementById('pdf-size').value;
      let width, height;
      
      // Always use 4x6 size (in mm)
      width = 101.6;  // 4 inches in mm
      height = 152.4; // 6 inches in mm
      
      // Create a new jsPDF instance with selected size
      const doc = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [width, height],
        putOnlyUsedFonts: true,
        floatPrecision: 16
      });
      
      console.log("PDF document created");
      
      // Use default font
      const fontName = 'helvetica';
      doc.setFont(fontName, "normal");

      if (selectedSize === '4x6') {
        // Layout for 4x6
        // Add title
        doc.setFontSize(16);
        const titleText = "Amazon Product";
        const titleWidth = doc.getTextWidth(titleText);
        doc.text(titleText, width/2, 15, { 
          align: "center"
        });
        
        // Add product title
        doc.setFontSize(12);
        const title = window.productInfo.title;
        const titleLines = doc.splitTextToSize(title, width * 0.9);
        doc.text(titleLines, width/2, 25, { 
          align: "center"
        });
        const titleHeight = titleLines.length * 5;
        
        // Calculate the position for price based on title length
        const priceY = Math.max(45, 25 + titleHeight + 10);
        
        // Add price
        doc.setFontSize(14);
        const priceText = window.productInfo.price;
        doc.text(priceText, width/2, priceY, { 
          align: "center"
        });
        
        // Add QR code
        const qrCanvas = document.querySelector('#qrcode canvas');
        const qrSize = 50; // Fixed size for 4x6
        
        if (qrCanvas) {
          console.log("QR canvas found");
          const qrImage = qrCanvas.toDataURL('image/png');
          doc.addImage(qrImage, 'PNG', (width - qrSize)/2, priceY + 15, qrSize, qrSize);
        } else {
          console.error("QR canvas not found!");
        }
        
        // Add URL
        doc.setFontSize(8);
        const urlText = window.productInfo.url;
        doc.text(urlText, width/2, priceY + qrSize + 20, { 
          align: "center"
        });
      } else {
        // 4×3 layout (but on 4x6 canvas)
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let cursorY = 10; // top margin
        
        // — Product title —
        doc.setFontSize(10);
        const titleLines = doc.splitTextToSize(window.productInfo.title, pageWidth * 0.9);
        doc.text(titleLines, pageWidth/2, cursorY, { align: "center" });
        cursorY += titleLines.length * doc.getLineHeightFactor() * doc.getFontSize() * 0.4; // further reduced spacing
      
        // — Price —
        doc.setFontSize(10);
        doc.text(window.productInfo.price, pageWidth/2, cursorY, { align: "center" });
        cursorY += doc.getLineHeightFactor() * doc.getFontSize() * 0.4; // further reduced spacing
      
        // — QR code —
        const qrCanvas = document.querySelector('#qrcode canvas');
        if (!qrCanvas) {
          console.error("QR canvas not found!");
        } else {
          const qrSize = 35;
          const qrImage = qrCanvas.toDataURL('image/png');
          // Position QR code in the middle of the first half of the page
          const qrY = Math.min(cursorY + 5, (pageHeight/2) - qrSize - 10);
          doc.addImage(qrImage, 'PNG', (pageWidth - qrSize)/2, qrY, qrSize, qrSize);
          cursorY = qrY + qrSize;
        }
      
        // — URL —
        doc.setFontSize(6);
        cursorY += 5;
        doc.text(window.productInfo.url, pageWidth/2, cursorY, { align: "center" });
        
        // The rest of the page will remain white (extra 3 inches of space)
      }
      
      
      
      console.log("PDF generated, opening in new tab...");
      
      // Save the PDF and open in new tab
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      chrome.tabs.create({ url: pdfUrl });
      
      console.log("PDF opened in new tab");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF: " + error.message);
    }
  }
}); 