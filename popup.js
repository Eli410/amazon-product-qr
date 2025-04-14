document.addEventListener('DOMContentLoaded', function() {
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
              width: 200,
              height: 200,
              colorDark: "#000000",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.H
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
      
      // Create a new jsPDF instance with custom size (100x150mm)
      const doc = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [100, 150],
        putOnlyUsedFonts: true,
        floatPrecision: 16
      });
      
      console.log("PDF document created");
      
      // Use default font
      const fontName = 'helvetica';
      doc.setFont(fontName, "normal");
      
      // Add title
      doc.setFontSize(16);
      doc.text("Amazon Product", 50, 15, { 
        align: "center",
        maxWidth: 90
      });
      
      // Add product title
      doc.setFontSize(12);
      const title = window.productInfo.title;
      
      // Split title into multiple lines if it's too long
      const titleLines = doc.splitTextToSize(title, 90);
      doc.text(titleLines, 50, 25, { 
        align: "center",
        maxWidth: 90
      });
      const titleHeight = titleLines.length * 5; // Approximate height per line in mm
      
      // Calculate the position for price based on title length
      const priceY = Math.max(45, 25 + titleHeight + 10); // Ensure minimum spacing of 10mm
      
      // Add price
      doc.setFontSize(14);
      doc.text(window.productInfo.price, 50, priceY, { 
        align: "center",
        maxWidth: 90
      });
      
      // Add QR code
      // Get the QR code canvas
      const qrCanvas = document.querySelector('#qrcode canvas');
      if (qrCanvas) {
        console.log("QR canvas found");
        // Convert canvas to image
        const qrImage = qrCanvas.toDataURL('image/png');
        
        // Add QR code to PDF (scaled to fit the smaller page)
        doc.addImage(qrImage, 'PNG', 25, priceY + 15, 50, 50);
      } else {
        console.error("QR canvas not found!");
      }
      
      // Add URL
      doc.setFontSize(8);
      doc.text(window.productInfo.url, 50, priceY + 75, { 
        align: "center",
        maxWidth: 90
      });
      
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