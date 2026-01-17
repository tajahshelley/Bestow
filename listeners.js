/* =========================================================
   PDF LINK INTERCEPTOR (runs immediately)
   ========================================================= */
const pdf_map = {
    "Accelerated Death Benefit Rider Disclosure": "https://resources-app.getreprise.com/myMlBXL/pdfs/accelerated_death_benefit.pdf",
    "Accelerated Death Benefit Disclosure": "https://resources-app.getreprise.com/myMlBXL/pdfs/accelerated_death_benefit.pdf",
    "HIPAA Authorization": "https://resources-app.getreprise.com/myMlBXL/pdfs/hipaa_authorization.pdf",
    "MIB Authorization": "https://resources-app.getreprise.com/myMlBXL/pdfs/mib_authorization.pdf",
    "Electronic Business Consent": "https://resources-app.getreprise.com/myMlBXL/pdfs/electric_business_consent.pdf",
    "Electronic Consent": "https://resources-app.getreprise.com/myMlBXL/pdfs/electric_business_consent.pdf",
    "Concierge Planning Rider Consent Form": "https://resources-app.getreprise.com/myMlBXL/pdfs/concierge_rider_form.pdf",
    "eDelivery Terms & Conditions of Use": "https://resources-app.getreprise.com/myMlBXL/pdfs/edelivery_terms.pdf",
    "Privacy Notice": "https://resources-app.getreprise.com/myMlBXL/pdfs/privacy_notice.pdf",
    "Application Part A": "https://resources-app.getreprise.com/myMlBXL/pdfs/application_part_a.pdf",
    "Application Part 1": "https://resources-app.getreprise.com/myMlBXL/pdfs/application_part_a.pdf",
    "Policy Promise": "https://resources-app.getreprise.com/myMlBXL/pdfs/policy_promise.pdf",
    "Download IconDownload Policy Promise": "https://resources-app.getreprise.com/myMlBXL/pdfs/application_part_a.pdf",
    "Agent Report": "https://resources-app.getreprise.com/myMlBXL/pdfs/Agent%20Report-IUL.pdf",
    "Statement of Understanding and Acknowledgment": "https://resources-app.getreprise.com/myMlBXL/pdfs/Statement%20of%20Understanding%20Acknowledgement-IUL.pdf",
    "Application Part 2": "https://resources-app.getreprise.com/myMlBXL/pdfs/Application%20Part%20B-IUL.pdf",
    "Application Part B": "https://resources-app.getreprise.com/myMlBXL/pdfs/Application%20Part%20B-IUL.pdf",
    "Illustration": "https://resources-app.getreprise.com/myMlBXL/pdfs/Illlustration-IUL.pdf"
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
};

let is_IUL_flow = false;
const iuFlowCallbacks = [];

navigator.serviceWorker.addEventListener("message", event => {
    if (event.data.action === "open-url") {
        window.open(event.data.url, "_blank");
    }
    if (event.data.action === "open-iul-for-pdfs") {
        is_IUL_flow = true;
        // Execute all registered callbacks
        iuFlowCallbacks.forEach(callback => callback());
        iuFlowCallbacks.length = 0; // Clear the array
    }
});

// Helper to run code when IUL flow is confirmed
function whenIULFlow(callback) {
    if (is_IUL_flow) {
        callback();
    } else {
        iuFlowCallbacks.push(callback);
    }
}

function hasDemoLifeHeritageIUL() {
    return document.body.textContent.includes("DemoLife Heritage IUL℠");
}

function getPdfMap() {
    return is_IUL_flow ? pdf_map : fe_pdf_map;
}

function findPdfUrl(text) {
    const pdf_link_map = getPdfMap();

    // Special handling for "Download IconDownload Policy Promise"
    if (text.includes("Download IconDownload Policy Promise")) {
        if (hasDemoLifeHeritageIUL()) {
            return "https://resources-app.getreprise.com/myMlBXL/pdfs/Policy%20Promise-IUL.pdf";
        } else {
            return "https://resources-app.getreprise.com/myMlBXL/pdfs/Policy-Promise-FE.pdf";
        }
    }

    // Try exact match first
    if (pdf_link_map[text]) {
        return pdf_link_map[text];
    }

    // Try partial match
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

pdfObserver.observe(document, {
    childList: true,
    subtree: true
});

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

/* =========================================================
   DOM CONTENT LOADED HANDLERS
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    /* =========================================================
       HIDE DANGER TOASTS
       ========================================================= */
    function hideDangerToast(toastBody) {
        if (!toastBody) return;

        // Find the danger type element within the toast body
        const dangerElement = toastBody.querySelector('[type="danger"]');

        if (dangerElement) {
            // Find the closest toast container to hide
            const toastContainer = toastBody.closest('.Toastify__toast');
            if (toastContainer) {
                toastContainer.style.display = 'none';
                console.log('Danger toast hidden');
            } else {
                // Fallback: hide the toast body itself
                toastBody.style.display = 'none';
                console.log('Danger toast body hidden');
            }
        }
    }

    // Check existing toasts on page load
    function checkExistingDangerToasts() {
        const toastBodies = document.querySelectorAll('.Toastify__toast-body');
        toastBodies.forEach(hideDangerToast);
    }

    // Observe for new toasts
    const dangerToastObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;

                // Check if the added node is a toast body
                if (node.classList?.contains('Toastify__toast-body')) {
                    hideDangerToast(node);
                }

                // Check if any child elements are toast bodies
                const toastBodies = node.querySelectorAll?.('.Toastify__toast-body');
                toastBodies?.forEach(hideDangerToast);
            });
        });
    });

    // Start observing
    dangerToastObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Check for existing toasts
    checkExistingDangerToasts();

    console.log('Danger toast observer initialized');


    /* =========================================================
       CONTACT INFO UPDATER (Immediate + Observer)
       ========================================================= */
    function updateContactInfo() {
        const paragraphs = document.querySelectorAll('p');
        for (const p of paragraphs) {
            if (
                p.textContent.includes('800-453-1448') ||
                p.textContent.includes('support@DemoLifelife.com')
            ) {
                p.innerHTML = p.innerHTML
                    .replace(/800-453-1448/g, '800-555-1448')
                    .replace(/support@DemoLifelife\.com/g, 'support@DemoLife.com');
                console.log('Contact info updated');
                return true;
            }
        }
        return false;
    }

    if (!updateContactInfo()) {
        const contactObserver = new MutationObserver(() => {
            if (updateContactInfo()) {
                contactObserver.disconnect();
            }
        });
        contactObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    /* =========================================================
       SECTION UTILITIES
       ========================================================= */
    function findSectionByHeader(headerText) {
        const headers = Array.from(document.querySelectorAll('h1, h2, h3'));
        for (const header of headers) {
            if (header.textContent.trim().includes(headerText)) {
                let parent = header.parentElement;
                while (parent && parent !== document.body) {
                    if (parent.querySelector('button') || parent.querySelector('form')) {
                        return parent;
                    }
                    parent = parent.parentElement;
                }
            }
        }
        return null;
    }

    /* =========================================================
       CHECKMARK VISIBILITY CONTROL
       ========================================================= */
    function hideCheckmark(section) {
        if (!section) return;
        const h2 = section.querySelector('h2');
        if (!h2) return;

        const checkmarkSvg = h2.querySelector('svg[aria-label="Checkmark Shorter Icon"]');
        if (checkmarkSvg) {
            const wrapper = checkmarkSvg.closest('.sc-hDZrUb');
            if (wrapper) {
                wrapper.style.display = 'none';
                console.log('Checkmark hidden');
            }
        }
    }

    function showCheckmark(section) {
        if (!section) return;
        const h2 = section.querySelector('h2');
        if (!h2) return;

        const checkmarkSvg = h2.querySelector('svg[aria-label="Checkmark Shorter Icon"]');
        if (checkmarkSvg) {
            const wrapper = checkmarkSvg.closest('.sc-hDZrUb');
            if (wrapper) {
                wrapper.style.display = '';
                console.log('Checkmark shown');
            }
        }
    }

    /* =========================================================
       HEADER-ONLY COLLAPSE / EXPAND (EXACT HEIGHT)
       ========================================================= */
    function getHeaderWrapper(section) {
        return section.querySelector('h2')?.closest('.sc-dxcDKg');
    }

    function collapseSection(section) {
        if (!section) return;
        const headerWrapper = getHeaderWrapper(section);
        if (!headerWrapper) return;

        Array.from(section.children).forEach(child => {
            if (child !== headerWrapper) {
                child.style.display = 'none';
            }
        });

        // Additionally hide the sibling div after the h2 for "Collect payment details"
        const h2 = section.querySelector('h2');
        if (h2 && h2.textContent.includes('Collect payment details')) {
            const siblingDiv = h2.nextElementSibling;
            if (siblingDiv && siblingDiv.classList.contains('sc-aXZVg')) {
                siblingDiv.style.display = 'none';
            }
        }

        console.log('Collapsed section to header only');
    }

    function expandSection(section) {
        if (!section) return;
        Array.from(section.children).forEach(child => {
            child.style.display = '';
        });
        console.log('Expanded section fully');
    }

    function isInEditMode(section) {
        return section && section.querySelector('form');
    }

    function hasTriggerText() {
        return document.body.textContent.includes(
            'is only a few steps away from no-hassle coverage!'
        );
    }

    function clickEditButton(section) {
        if (!section) return false;
        const editButton = Array.from(section.querySelectorAll('button')).find(
            btn => btn.getAttribute('data-testid') === 'confirm-edit-btn' &&
                btn.querySelector('svg[aria-label="Pencil Icon"]')
        );

        if (editButton) {
            console.log('Clicking Edit button');
            editButton.click();
            return true;
        }
        return false;
    }

    /* =========================================================
       RETURN TO DASHBOARD RELOAD HANDLER
       ========================================================= */
    function handleReturnToDashboard(element) {
        if (!element) return false;

        const elementText = (element.textContent || element.innerText || '').trim().toLowerCase();

        if (elementText.includes('return to dashboard')) {
            console.log('Return to dashboard element clicked - cleaning page state and reloading');

            // Use replace to reload and clean page state
            setTimeout(() => {
                window.location.replace(window.location.href);
            }, 100);

            return true;
        }

        return false;
    }

    /* =========================================================
       CLICK HANDLERS
       ========================================================= */
    document.addEventListener('click', (e) => {
        // Check for any element (button, link, etc.) with "return to dashboard" text
        const clickedElement = e.target.closest('button, a, [role="button"]');

        // Also check the direct target in case it's a span or other element
        if (handleReturnToDashboard(clickedElement) || handleReturnToDashboard(e.target)) {
            e.preventDefault();
            e.stopPropagation();
            return; // Exit early since we're reloading
        }

        const button = e.target.closest('button');
        if (!button) return;

        if (button.textContent.includes('Save payment schedule')) {
            console.log('Save payment schedule clicked');
            setTimeout(() => {
                const billingSection = findSectionByHeader('Collect billing information');
                if (billingSection) {
                    expandSection(billingSection);
                    setTimeout(() => clickEditButton(billingSection), 100);
                }
            }, 300);
        }

        if (
            button.textContent.toLowerCase().includes('save') &&
            button.textContent.toLowerCase().includes('billing')
        ) {
            console.log('Save billing information clicked');
            setTimeout(() => {
                const billingSection = findSectionByHeader('Collect billing information');
                if (billingSection) {
                    showCheckmark(billingSection);
                }
                const paymentDetails = findSectionByHeader('Collect payment details');
                if (paymentDetails) {
                    expandSection(paymentDetails);
                }
            }, 300);
        }

        if (
            button.textContent.toLowerCase().includes('save') &&
            button.textContent.toLowerCase().includes('payment') &&
            !button.textContent.toLowerCase().includes('schedule')
        ) {
            console.log('Save payment details clicked');
            setTimeout(() => {
                const paymentDetails = findSectionByHeader('Collect payment details');
                if (paymentDetails) {
                    showCheckmark(paymentDetails);
                }
            }, 300);
        }
    });

    /* =========================================================
       INITIAL FLOW LOGIC
       ========================================================= */
    function initializeFlow() {
        if (!hasTriggerText()) return;

        console.log('Initializing progressive flow');
        const paymentSchedule = findSectionByHeader('Payment schedule');
        const billing = findSectionByHeader('Collect billing information');
        const paymentDetails = findSectionByHeader('Collect payment details');

        // Hide checkmarks initially
        if (billing) {
            hideCheckmark(billing);
            collapseSection(billing);
        }
        if (paymentDetails) {
            hideCheckmark(paymentDetails);
            collapseSection(paymentDetails);
        }

        if (paymentSchedule && !isInEditMode(paymentSchedule)) {
            console.log('Payment schedule in view mode');
            const observer = new MutationObserver(() => {
                const b = findSectionByHeader('Collect billing information');
                const p = findSectionByHeader('Collect payment details');
                if (b) {
                    collapseSection(b);
                    hideCheckmark(b);
                }
                if (p) {
                    collapseSection(p);
                    hideCheckmark(p);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            clickEditButton(paymentSchedule);

            setTimeout(() => {
                observer.disconnect();
                console.log('Stopped observing DOM changes');
            }, 1000);
        }
    }

    /* =========================================================
       OBSERVER-DRIVEN BOOTSTRAP
       ========================================================= */
    function waitForReadyAndInit() {
        const observer = new MutationObserver(() => {
            if (
                hasTriggerText() &&
                findSectionByHeader('Payment schedule')
            ) {
                observer.disconnect();
                console.log('Required DOM detected');
                initializeFlow();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    waitForReadyAndInit();

    /* =========================================================
       PAYMENT INFORMATION VIEW-CARDS FLOW (ADDED FOR NEW STRUCTURE)
       ========================================================= */
    function findViewCardByHeader(headerText) {
        const viewCards = document.querySelectorAll('[data-testid="view-card"]');
        for (const card of viewCards) {
            const h2 = card.querySelector('h2');
            if (h2 && h2.textContent.trim().includes(headerText)) {
                return card;
            }
        }
        return null;
    }

    function hideViewCardCheckmark(card) {
        if (!card) return;
        const checkmarkSvg = card.querySelector('svg[aria-label="Checkmark Shorter Icon"]');
        if (checkmarkSvg) {
            const wrapper = checkmarkSvg.closest('.sc-hDZrUb') || checkmarkSvg.parentElement;
            if (wrapper) {
                wrapper.style.display = 'none';
            }
        }
    }

    function showViewCardCheckmark(card) {
        if (!card) return;
        const checkmarkSvg = card.querySelector('svg[aria-label="Checkmark Shorter Icon"]');
        if (checkmarkSvg) {
            const wrapper = checkmarkSvg.closest('.sc-hDZrUb') || checkmarkSvg.parentElement;
            if (wrapper) {
                wrapper.style.display = '';
            }
        }
    }

    function collapseViewCard(card) {
        if (!card) return;
        const headerWrapper = card.querySelector('h2')?.closest('.sc-dxcDKg');
        if (!headerWrapper) return;

        Array.from(card.children).forEach(child => {
            if (child !== headerWrapper) {
                child.style.display = 'none';
            }
        });
    }

    function expandViewCard(card) {
        if (!card) return;
        Array.from(card.children).forEach(child => {
            child.style.display = '';
        });
    }

    function clickViewCardEditButton(card) {
        if (!card) return false;
        const editButton = card.querySelector('button[data-testid="confirm-edit-btn"]');
        if (editButton) {
            editButton.click();
            return true;
        }
        return false;
    }

    function initializeViewCardsFlow() {
        if (!hasTriggerText()) return;

        const setPaymentCard = findViewCardByHeader('Set payment schedule');
        if (!setPaymentCard) return;

        console.log('Initializing view-cards flow');

        const billingCard = findViewCardByHeader('Collect billing information');
        const paymentDetailsCard = findViewCardByHeader('Collect payment details');

        if (billingCard) {
            hideViewCardCheckmark(billingCard);
            collapseViewCard(billingCard);
        }
        if (paymentDetailsCard) {
            hideViewCardCheckmark(paymentDetailsCard);
            collapseViewCard(paymentDetailsCard);
        }

        const cardFlowObserver = new MutationObserver(() => {
            const b = findViewCardByHeader('Collect billing information');
            const p = findViewCardByHeader('Collect payment details');
            if (b) {
                collapseViewCard(b);
                hideViewCardCheckmark(b);
            }
            if (p) {
                collapseViewCard(p);
                hideViewCardCheckmark(p);
            }
        });

        cardFlowObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            cardFlowObserver.disconnect();
        }, 1000);
    }

    document.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const buttonText = button.textContent || '';

        if (buttonText.includes('Save payment schedule')) {
            setTimeout(() => {
                const billingCard = findViewCardByHeader('Collect billing information');
                if (billingCard) {
                    expandViewCard(billingCard);
                    setTimeout(() => clickViewCardEditButton(billingCard), 100);
                }
            }, 300);
        }

        if (buttonText.toLowerCase().includes('save') && buttonText.toLowerCase().includes('billing')) {
            setTimeout(() => {
                const billingCard = findViewCardByHeader('Collect billing information');
                if (billingCard) {
                    showViewCardCheckmark(billingCard);
                }
                const paymentDetailsCard = findViewCardByHeader('Collect payment details');
                if (paymentDetailsCard) {
                    expandViewCard(paymentDetailsCard);
                }
            }, 300);
        }

        if (buttonText.toLowerCase().includes('save') && buttonText.toLowerCase().includes('payment') && !buttonText.toLowerCase().includes('schedule')) {
            setTimeout(() => {
                const paymentDetailsCard = findViewCardByHeader('Collect payment details');
                if (paymentDetailsCard) {
                    showViewCardCheckmark(paymentDetailsCard);
                }
            }, 300);
        }
    });

    function waitForViewCardsAndInit() {
        const observer = new MutationObserver(() => {
            if (hasTriggerText() && findViewCardByHeader('Set payment schedule')) {
                observer.disconnect();
                initializeViewCardsFlow();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        if (hasTriggerText() && findViewCardByHeader('Set payment schedule')) {
            observer.disconnect();
            initializeViewCardsFlow();
        }
    }

    waitForViewCardsAndInit();

    /* =========================================================
       NAME REPLACEMENT UTILITY
       ========================================================= */
    function replaceNameInTextNode(textNode) {
        if (textNode.nodeType !== Node.TEXT_NODE) return;
        if (textNode.nodeValue && textNode.nodeValue.includes('XYZ003 FN XYZ003 LN')) {
            textNode.nodeValue = textNode.nodeValue.replace(/XYZ003 FN XYZ003 LN/g, 'Nathan Osborn');
            console.log('Name replaced in text node');
        }
    }

    function walkTextNodes(element) {
        if (!element) return;

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(replaceNameInTextNode);
    }

    // Initial check
    walkTextNodes(document.body);

    // Observe for new elements
    const nameObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    replaceNameInTextNode(node);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    walkTextNodes(node);
                }
            });

            // Handle text content changes
            if (mutation.type === 'characterData') {
                replaceNameInTextNode(mutation.target);
            }
        });
    });

    nameObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    console.log('Name replacement observer initialized');

    /* =========================================================
       CLONE ELEMENT UTILITY
       ========================================================= */
    function cloneWhenElementWithClassesRendered(classList, requiredText, newText, cloneOnce = false) {
        const containerSelector = classList.map(c => `.${c}`).join('');
        const processed = new WeakSet();
        let hasClonedOnce = false;

        function tryCloneFromNode(node) {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.dataset?.clonedFromObserver) {
                return;
            }

            if (node.matches?.(containerSelector)) {
                scanContainer(node);
            }

            const nestedContainers = node.querySelectorAll?.(containerSelector);
            if (nestedContainers?.length) {
                nestedContainers.forEach(scanContainer);
            }

            if (node.tagName === 'LI') {
                const container = node.closest(containerSelector);
                if (container) {
                    scanContainer(container);
                }
            }
        }

        function scanContainer(ul) {
            const lis = ul.querySelectorAll('li');
            lis.forEach(li => {
                if (processed.has(li)) {
                    return;
                }

                if (li.dataset?.clonedFromObserver) {
                    return;
                }

                if (cloneOnce && hasClonedOnce) {
                    return;
                }

                const anchor = li.querySelector('a');
                const text = anchor?.textContent?.trim();

                if (text === requiredText) {
                    processed.add(li);
                    duplicate(li);

                    if (cloneOnce) {
                        hasClonedOnce = true;
                        console.log('[clone] Clone-once flag set - no more clones will be created');
                    }
                }
            });
        }

        function duplicate(li) {
            const clone = li.cloneNode(true);
            clone.dataset.clonedFromObserver = 'true';

            const cloneAnchor = clone.querySelector('a');
            if (cloneAnchor) {
                cloneAnchor.textContent = newText;
            }

            li.after(clone);
        }

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation =>
                mutation.addedNodes.forEach(tryCloneFromNode)
            );
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        return observer;
    }

    // Clone "Payment Authorization Form" only on first occurrence
    whenIULFlow(() => {
        cloneWhenElementWithClassesRendered(
            ['sc-uYXSi', 'cqkSX'],
            'Application Part B',
            'Payment Authorization Form',
            true
        );

        // Clone "Illustration" on every occurrence
        cloneWhenElementWithClassesRendered(
            ['sc-uYXSi', 'cqkSX'],
            'Application Part B',
            'Illustration'
        );
    });

});