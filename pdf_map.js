/* =========================================================
   PDF LINK INTERCEPTOR (runs immediately)
========================================================= */

pdf_map = {
    "Accelerated Death Benefit Rider Disclosure": "https://resources-app.getreprise.com/myMlBXL/pdfs/accelerated_death_benefit.pdf",
    "HIPAA Authorization": "https://resources-app.getreprise.com/myMlBXL/pdfs/hipaa_authorization.pdf",
    "MIB Authorization": "https://resources-app.getreprise.com/myMlBXL/pdfs/mib_authorization.pdf",
    "Electronic Business Consent": "https://resources-app.getreprise.com/myMlBXL/pdfs/electric_business_consent.pdf",
    "Concierge Planning Rider Consent Form": "https://resources-app.getreprise.com/myMlBXL/pdfs/concierge_rider_form.pdf",
    "eDelivery Terms & Conditions of Use": "https://resources-app.getreprise.com/myMlBXL/pdfs/edelivery_terms.pdf",
    "Privacy Notice": "https://resources-app.getreprise.com/myMlBXL/pdfs/privacy_notice.pdf",
    "Application Part A": "https://resources-app.getreprise.com/myMlBXL/pdfs/application_part_a.pdf",
    "Policy Promise": "https://resources-app.getreprise.com/myMlBXL/pdfs/policy_promise.pdf",
    "Download IconDownload Policy Promise": "https://resources-app.getreprise.com/myMlBXL/pdfs/application_part_a.pdf"
};

const fe_pdf_map = {
    "Electronic Business Consent": "https://resources-app.getreprise.com/myMlBXL/pdfs/Electronic%20Business%20Consent-FE.pdf",
    "HIPAA Authorization": "https://resources-app.getreprise.com/myMlBXL/pdfs/HIPPAA%20Authorization-FE.pdf",
    "Privacy Notice": "https://resources-app.getreprise.com/myMlBXL/pdfs/Privacy%20Notice-FE.pdf",
    "Accelerated Death Benefit Rider Disclosure": "https://resources-app.getreprise.com/myMlBXL/pdfs/Accellerated%20Death%20Rider%20Benefit-FE.pdf",
    "MIB Authorization": "https://resources-app.getreprise.com/myMlBXL/pdfs/MIB%20Authorization-FE.pdf",
    "Concierge Planning Rider Consent Form": "https://resources-app.getreprise.com/myMlBXL/pdfs/concierge_rider_form.pdf",
    "eDelivery Terms & Conditions of Use": "https://resources-app.getreprise.com/myMlBXL/pdfs/eDelivery%20Terms%20&%20Conditons-%20FE.pdf",
    "Application Part A": "https://resources-app.getreprise.com/myMlBXL/pdfs/Application%20Part%20A-FE.pdf",
    "Application Part B": "https://resources-app.getreprise.com/myMlBXL/pdfs/Application-Part%20B-FE.pdf",
    "Agent Report": "https://resources-app.getreprise.com/myMlBXL/pdfs/Agent%20Report-IUL.pdf",

}

navigator.serviceWorker.addEventListener("message", event => {
    if (event.data.action === "open-url") {
        window.open(event.data.url, "_blank");
    }
});

// Check if "DemoLife Heritage IUL℠" is present on the page
function hasDemoLifeHeritageIUL() {
    if (document.body.textContent.includes("DemoLife Heritage IUL℠")) {
        return true
    };
    return false;
}

function getPdfMap() {
    return hasDemoLifeHeritageIUL() ? pdf_map : fe_pdf_map;
}

function findPdfUrl(text) {
    const pdf_link_map = getPdfMap();

    // Special handling for "Download IconDownload Policy Promise"
    if (text.includes("Download IconDownload Policy Promise")) {
        if (hasDemoLifeHeritageIUL()) {
            // URL when "DemoLife Heritage IUL℠" is present
            return "https://resources-app.getreprise.com/myMlBXL/pdfs/Policy%20Promise-IUL.pdf";
        } else {
            // URL when "DemoLife Heritage IUL℠" is not present
            return "https://resources-app.getreprise.com/myMlBXL/pdfs/Policy-Promise-FE.pdf";
        }
    }

    // Try exact match first
    if (pdf_link_map[text]) {
        return pdf_link_map[text];
    }

    // Try partial match - check if any key is contained in the text
    for (const [key, value] of Object.entries(pdf_link_map)) {
        if (text.includes(key)) {
            return value;
        }
    }

    return null;
}

function attachLinkHandler(link) {
    if (link._patched) return;
    link._patched = true;
    const href = link.getAttribute('href');
    if (!href) return;
    if (href.includes("storage.googleapis.com/ryerson-qa-dss-storage")) {
        link.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            const link_text = (link.textContent || link.innerText || '').trim();
            let pdf_url = findPdfUrl(link_text);
            if (pdf_url) {
                window.open(`https://resources-app.getreprise.com/static_assets/pdfjs/pdfjs-5.2.133-dist/web/viewer.html?file=${pdf_url}`, "_blank");
            }
        }, true);
    }
}

function attachButtonHandler(button) {
    if (button._patched) return;
    button._patched = true;

    button.addEventListener("click", e => {
        const button_text = (button.textContent || button.innerText || '').trim();

        let pdf_url = findPdfUrl(button_text);

        if (pdf_url) {
            console.log('PDF found, preventing default');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            window.open(`https://resources-app.getreprise.com/static_assets/pdfjs/pdfjs-5.2.133-dist/web/viewer.html?file=${pdf_url}`, "_blank");
        }
    }, true);
}

const pdfObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;

            if (node.matches?.('a[target="_blank"]')) {
                attachLinkHandler(node);
            }
            node.querySelectorAll?.('a[target="_blank"]').forEach(attachLinkHandler);

            if (node.matches?.('button')) {
                attachButtonHandler(node);
            }
            node.querySelectorAll?.('button').forEach(attachButtonHandler);
        }
    }
});

pdfObserver.observe(document, { childList: true, subtree: true });

// Patch existing elements when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('button').forEach(attachButtonHandler);
        document.querySelectorAll('a[target="_blank"]').forEach(attachLinkHandler);
    });
} else {
    document.querySelectorAll('button').forEach(attachButtonHandler);
    document.querySelectorAll('a[target="_blank"]').forEach(attachLinkHandler);
}

console.log('PDF interceptor initialized');