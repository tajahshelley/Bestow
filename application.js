let application_answers = {};
let additional_data = [];
let app_approved = false;
let beneficiaries = [];
let application_state = {};
let underwriting_state = 0;
let checkout_signatures_state = 0;
let apl = "enabled";
let virtual_notification_preference = "";

// code for pre-approval flow

function validatePreQualAnswers(answersJson) {
    try {
        const answers = JSON.parse(answersJson);

        // Fields to ignore in validation
        const ignoreFields = ['prequal_height', 'prequal_weight'];

        for (const answer of answers) {
            const { key, value } = answer;

            // Skip ignored fields
            if (ignoreFields.includes(key)) {
                console.log(`[pre-qual skip] ${key}: skipping validation`);
                continue;
            }

            // Check for non-empty arrays that don't contain only "none"
            if (Array.isArray(value)) {
                const hasNonNoneValue = value.some(item => {
                    const normalized = String(item).toLowerCase().trim();
                    return normalized !== "" && normalized !== "none";
                });
                if (hasNonNoneValue) {
                    console.log(`[pre-qual decline] ${key}: found non-none value in array`, value);
                    return true;
                }
            }
            // Check for boolean values that are true
            else if (typeof value === "boolean" && value === true) {
                console.log(`[pre-qual decline] ${key}: true value found`);
                return true;
            }
            // Check for non-false/non-zero numeric or string values
            else if (value !== false && value !== 0 && value !== "false" && value !== "") {
                const normalized = String(value).toLowerCase().trim();
                if (normalized !== "none" && normalized !== "false") {
                    console.log(`[pre-qual decline] ${key}: non-compliant value`, value);
                    return true;
                }
            }
        }

        console.log("[pre-qual approve] All conditions passed");
        return false;

    } catch (error) {
        console.error("[pre-qual error] Failed to parse answers:", error);
        // In case of error, default to decline for safety
        return true;
    }
}

const handlePreApprovalRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    const answers = formData.answers
    if (formData.interactionId === "submit-pre-qual") {
        let res = null;
        if (validatePreQualAnswers(answers)) {
            res = {
                "type": "state-success",
                "interactionId": "submit-pre-qual",
                "timestamp": 1766511385734,
                "data": ""
            }
        } else {
            res = {
                "type": "state-success",
                "interactionId": "submit-pre-qual",
                "timestamp": 1766511385734,
                "data": "SELECT_NON_TOBACCO"
            }
        }
        return new Response(JSON.stringify(res), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        });
    }
};


const get_started = async (response) => {
    let body = await response.json();
    checkout_signatures_state = 0
    //resetting the state so it won't populate data at the beginning of the demo.
    if (get_started_state === "initial" || get_started_state === "done") {
        application_state = {
            productAndAgentDetails: {
                state: qoute_data.state,
                product: application_type,
            },
        };
        application_answers = {};
        beneficiaries = [];
        additional_data = [];
        body.viewContext.multiCardGetStartedStore.fromClient.answers = {};
    } else if (get_started_state === "save-agent-info") {
        body.viewContext.multiCardGetStartedStore.fromClient.answers = {};
    }
    body.viewContext.multiCardGetStarted = application_state;
    body.viewContext.multiCardQuote = multiCardQuote;
    body = populate_answers(body, true);

    if (application_state?.productAndAgentDetails?.state) {
        application_answers["unchangeable_state"] = {
            key: "unchangeable_state",
            value: application_state.productAndAgentDetails.state,
            type: "set_once_string",
            dirty: false,
        };
    }
    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

const handleApplicationRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    console.log('test for getting to handleApplicationRequest')
    save_answers(formData);
    if (formData.intendedCoverage)
        application_answers.intendedCoverage = formData.intendedCoverage;
    if (formData.product) application_type = formData.product;
    if (
        formData.interactionId === "save-coverage-info-iul-virtual" || //iul virtual
        formData.interactionId === "save-coverage-info-iul-in-person" || //iul in person
        formData.interactionId === "save-coverage-info-in-person" || //fe in person
        formData.interactionId === "save-coverage-info-virtual" //fe virtual
    ) {
        const redirects = {
            "save-coverage-info-iul-virtual":
                "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/consent",
            "save-coverage-info-iul-in-person":
                "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/consent",
            "save-coverage-info-in-person":
                "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/consent",
            "save-coverage-info-virtual":
                "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/consent",
        };
        get_started_state = "done";
        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirects[formData.interactionId],
            },
        });
    }

    const res = {
        type: "state-success",
        interactionId: formData.interactionId,
        timestamp: Date.now(),
    };
    if (formData.interactionId === "save-agent-info") {
        get_started_state = "save-agent-info";
        application_state["productAndAgentDetails"] = {
            state: formData.state,
            agentProfileId: formData.agentProfileId,
            product: formData.product,
            agentProfileEmail: "taagent+XYZ003@bestow.com",
        };
        res.data = {
            productAndAgentDetails: application_state["productAndAgentDetails"],
        };
    } else if (formData.interactionId === "save-insured-info") {
        get_started_state = "save-insured-info";
        application_state["proposedInsuredAndQuoteRequestDetails"] = {
            birth_date: formData.birth_date,
            first_name: formData.first_name,
            gender: formData.gender,
            height: parseInt(formData.height),
            last_name: formData.last_name,
            middle_name: formData.middle_name,
            primary_email: formData.primary_email,
            quoteId: "c8d20397-5a3a-42fd-a885-3e06048edd62",
            sales_medium: formData.sales_medium,
            tb: formData.tb,
            weight: parseInt(formData.weight),
        };
    }

    return new Response(JSON.stringify(res), {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
        },
    });
};

const handleReplacementRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    save_answers(formData);
    if (
        formData.interactionId === "navigate-to-personal" ||
        formData.interactionId === "save-and-continue"
    ) {
        const salesMedium = get_sales_medium();

        // if it is is iul set for pfds
        if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
            self.clients
                .matchAll({ type: "window", includeUncontrolled: true })
                .then((clientList) => {
                    if (clientList.length > 0) {
                        clientList[0].postMessage({
                            action: "open-iul-for-pdfs",
                        });
                    }
                });
        }

        let redirect;

        if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
            redirect =
                salesMedium === "in_person"
                    ? "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/personal"
                    : "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/personal";
        } else {
            redirect =
                salesMedium === "in_person"
                    ? "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/personal"
                    : "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/personal";
        }

        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
};


const handlePersonalRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    save_answers(formData);
    if (
        formData.interactionId === "navigate-to-medical" ||
        formData.interactionId === "save-and-continue"
    ) {
        const salesMedium = get_sales_medium();

        let redirect;

        if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
            redirect =
                salesMedium === "in_person"
                    ? "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/medical"
                    : "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/medical";
        } else {
            redirect =
                salesMedium === "in_person"
                    ? "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/medical"
                    : "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/medical";
        }

        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
};

// code for get quote flow
const handleMedicalRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    save_answers(formData);
    if (formData.interactionId === "navigate-to-lifestyle") {
        const salesMedium = get_sales_medium();
        let redirect;

        if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
            redirect =
                salesMedium === "in_person"
                    ? "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/lifestyle"
                    : "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/lifestyle";
        } else {
            redirect =
                salesMedium === "in_person"
                    ? "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/lifestyle"
                    : "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/lifestyle";
        }

        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
};

const handleLifestyleRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    save_answers(formData);
    if (formData.interactionId === "navigate-to-pin-handoff") {
        const sales_medium = get_sales_medium();
        let redirect;

        if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
            redirect =
                sales_medium === "in_person"
                    ? "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/handoff-to-applicant"
                    : "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/document-pin-handoff";
        } else {
            redirect =
                sales_medium === "in_person"
                    ? "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/handoff-to-applicant"
                    : "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/document-pin-handoff";
        }
        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
};

const handlePINRequest = async ({ request }) => {

    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );

    virtual_notification_preference = formData.notificationPreference;

    // Determine the URL based on notification preference and application type
    const pinUrl =  virtual_notification_preference === "TYPE_EMAIL"
        ? "https://app.getreprise.com/launch/Q6oZNey/"
        : "https://app.getreprise.com/launch/x6412kn/"

    if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                if (clientList.length > 0) {
                    clientList[0].postMessage({
                        action: "open-url",
                        url: pinUrl
                    });
                }
            });
    }
    else {
        // FE workflow
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                if (clientList.length > 0) {
                    clientList[0].postMessage({
                        action: "open-url",
                        url: pinUrl
                    });
                }
            });
    }

    save_answers(formData);
    if (formData.interactionId === "documents-waiting") {
        const redirect =
            application_type === "FINANCIAL_FOUNDATION_IUL_II"
                ? "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/sign-with-pin"
                : "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/sign-with-pin";
        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
};


const handleCommissionRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    save_answers(formData);

    // if (formData.interactionId === "commission-complete") {
    //   return new Response(
    //     JSON.stringify({
    //       type: "state-success",
    //       interactionId: formData.interactionId,
    //       timestamp: Date.now(),
    //       data: null,
    //     }),
    //     {
    //       status: 200,
    //       headers: { "Content-Type": "application/json; charset=utf-8" },
    //     }
    //   );
    // }

    const sales_medium = get_sales_medium();
    let redirect;

    if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
        redirect =
            sales_medium === "in_person"
                ? "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/agent-review-documents"
                : "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/agent-review-documents";
    } else {
        redirect =
            sales_medium === "in_person"
                ? "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/agent-review-documents"
                : "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/agent-review-documents";
    }

    if (formData.interactionId === "agent-relationship-disclosures-complete") {
        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
};

const handleReviewDocumentsRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    save_answers(formData);

    if (formData.interactionId === "validate-agent-number") {
        const sales_medium = get_sales_medium();
        let redirect;

        if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
            redirect =
                sales_medium === "in_person"
                    ? "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/underwriting"
                    : "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/underwriting";
        } else {
            redirect =
                sales_medium === "in_person"
                    ? "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/underwriting"
                    : "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/underwriting";
        }
        console.log("redirecting to underwriting", redirect, application_type);
        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
};

const handleUnderwritingRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    save_answers(formData);
    if (formData.interactionId === "go-through-underwriting") {
        underwriting_state = 0;
        let redirect;
        if (shouldDecline()) {
            // fail link
            redirect =
                application_type === "FINANCIAL_FOUNDATION_IUL_II"
                    ? "/agent/iul/virtual/95e693b0-1bb5-4fa1-a605-cc78319757d2/overview"
                    : "/agent/virtual/fdc86577-f53e-4db5-a544-68cab58f17b9/overview";
        } else {
            //  approved link/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/approval
            app_approved = true;
            if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
                redirect =  "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/approval"
            } else {
                redirect =
                    get_sales_medium() === "in_person"
                        ? "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/approval"
                        : "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/approval";
            }

        }
        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
};

const handleIULApprovalRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    console.log("form data in approval", formData);
    save_answers(formData);
    // check interaction id: navigate-to-checkout, confirm-iul-coverage, billing-information-confirm, payment-method-confirm
    // update-iul-illustration
    const redirect = get_sales_medium() === "in_person" ? "/agent/iul/72414f8f-4909-466d-b6ae-4ca92983afd5/checkout-details" : "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/checkout-details";
    if (
        formData.interactionId === "navigate-to-3pp-checkout" ||
        formData.interactionId === "confirm-iul-coverage"
    ) {
        console.log("redirecting to checkout");
        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
    if (formData.interactionId === "download-iul-illustration-pdf") {
        const res = {
            type: "state-success",
            interactionId: "download-iul-illustration-pdf",
            timestamp: 1758234280108,
            data: {
                __typename: "IllustrationDocument",
                signedUrl:
                    "https://storage.googleapis.com/ryerson-qa-dss-storage/404576d5-a3d7-48a5-b481-d78fd3e81b52",
            },
        };
        return new Response(JSON.stringify(res), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }
    // for now until we handle recompute logic
    if (formData.interactionId === "update-iul-illustration") {
        let resp_data = quoteMath(quote_approval_template_resp, formData);
        resp_data = populate_qoute_data(resp_data, {
            birth_date: formData.dateOfBirth,
            gender: application_answers.gender.value,
            state: application_answers.unchangeable_state,
        });
        const res = {
            type: "state-success",
            interactionId: formData.interactionId,
            timestamp: Date.now(),
            data: resp_data.data,
        };
        return new Response(JSON.stringify(res), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }
};

const handleCheckoutDetailsRequest = async ({ request }) => {
    console.log("checkout post request details");
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    if (formData.interactionId === "iul-policy-edit") {
        const redirect =
            get_sales_medium() === "in_person"
                ? "/agent/iul/virtual/72414f8f-4909-466d-b6ae-4ca92983afd5/approval"
                : "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/approval";
        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
    const res = {
        type: "state-success",
        interactionId: formData.interactionId,
        timestamp: 1759782237176,
        data: {
            completeAdditionalInfo: {
                __typename: "MutationSuccess",
            },
        },
    };
    if (formData.interactionId === "additional-info-confirm") {
        parse_and_populate_additional_data(formData);
    }
    if (formData.interactionId === "beneficiaries-complete") {
        parse_and_populate_beneficiaries(formData);
    }
    if (formData.interactionId === "billing-information-confirm") {
        res.data = null;
    }
    if (formData.interactionId === "customize-complete") {
        apl = formData.apl;
    }
    if (formData.interactionId === "customize-coverage") {
        res.data = {
            customizeCoverage: {
                __typename: "MutationSuccess",
            },
        };
    }
    return new Response(JSON.stringify(res), {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
        },
    });
};

let payment_map = null;
let secondary_contact_map = null;
let bank_account_info_map = null;
let credit_card_info_map = null;

const handleCheckoutPaymentRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );

    console.log("formData in checkout payment", formData);
    console.log("formData.interactionId:", formData.interactionId);

    if (
        formData.interactionId === "payment-schedule-confirm" ||
        formData.interactionId === "billing-info-complete" ||
        formData.interactionId === "payment-details-complete" ||
        formData.interactionId === "payment-iul-schedule-confirm" ||
        formData.interactionId === "payment-schedule-complete"
    ) {
        console.log("interaction id matched in checkout payment");
        save_answers(formData);

        const res = {
            type: "state-success",
            interactionId: formData.interactionId,
            timestamp: 1760021290094,
            data: "",
        };

        if (formData.interactionId === "payment-iul-schedule-confirm") {
            payment_map = null;
            final_yearly_premium = parseInt(formData.yearly_premium || 0);
            final_monthly_premium = parseInt(formData.monthly_premium || 0);
            if (application_answers?.intendedCoverage) {
                final_face_amount = parseInt(String(application_answers.intendedCoverage).replace(/,/g, "")) * 100;
            }
            payment_map = {
                billing_mode: formData.billing_mode || null,
                monthly_premium: formData.monthly_premium || null,
                billing_schedule: formData.billing_schedule || null,
                start_date: formData.start_date || null,
            };
            console.log("payment_map: ", payment_map);
            console.log("Captured final values:", { final_monthly_premium, final_yearly_premium, final_face_amount });
        }

        if (formData.interactionId === "payment-schedule-complete") {
            payment_map = null;
            payment_map = {
                billing_mode: formData.billing_mode || null,
                monthly_premium: formData.monthly_premium || null,
                yearly_premium: formData.yearly_premium || null,
                billing_schedule: formData.billing_schedule || null,
                ssbb_payment_schedule: formData.ssbb_payment_schedule || null,
                start_date: formData.start_date || null,
                radioInput: formData.radioInput || null
            };
            console.log("payment_map: ", payment_map);

            final_monthly_premium = parseInt(formData.monthly_premium || 0);
            final_yearly_premium = parseInt(formData.yearly_premium || 0);
            if (application_answers?.intendedCoverage) {
                final_face_amount = parseInt(String(application_answers.intendedCoverage).replace(/,/g, "")) * 100;
            }
            console.log("Captured final values:", { final_monthly_premium, final_yearly_premium, final_face_amount });
        }

        if (formData.interactionId === "billing-info-complete") {
            // checking if there is secondary contact information
            if (formData["secondary_contact.full_name.first"]) {
                secondary_contact_map = null;
                secondary_contact_map = {
                    first: formData["secondary_contact.full_name.first"] || null,
                    last: formData["secondary_contact.full_name.last"] || null,
                    street_1: formData["secondary_contact.address.street_1"] || null,
                    street_2: formData["secondary_contact.address.street_2"] || "",
                    city: formData["secondary_contact.address.city"] || null,
                    state: formData["secondary_contact.address.state"] || null,
                    postal_code: formData["secondary_contact.address.postal_code"] || null,
                    phone: formData["secondary_contact.phone"] || null,
                    email: formData["secondary_contact.email"] || null
                };
            }
        }

        if (formData.interactionId === "payment-details-complete") {
            if (formData.payment_method_type === "BANK_ACCOUNT") {
                bank_account_info_map = null;
                bank_account_info_map = {
                    id: "Q3PHJDX88WJX66W5",
                    method_type: formData.payment_method_type,
                    bank_name: "UNLISTED TEST BANK",
                    last4: formData["ach_payment_data.account_number"].slice(-4),
                    account_type: formData["ach_payment_data.account_type"] === "AT_CHECKING" ? "checking" : "savings",
                    account_number_token: "782b19b5-3f4e-4351-b670-ff7920d6236d",
                    routing_number: formData["ach_payment_data.routing_number"]
                };
            } else if (formData.payment_method_type === "CARD") {
                credit_card_info_map = null;
            }
        }

        return new Response(JSON.stringify(res), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        });
    }

    if (formData.interactionId === "go-to-checkout-signatures") {
        console.log(">>> Capturing data from go-to-checkout-signatures");

        save_answers(formData);

        if (formData.monthly_premium) {
            final_monthly_premium = parseInt(formData.monthly_premium);
            console.log("Captured final_monthly_premium:", final_monthly_premium);
        }
        if (formData.yearly_premium) {
            final_yearly_premium = parseInt(formData.yearly_premium);
            console.log("Captured final_yearly_premium:", final_yearly_premium);
        }

        if (!final_face_amount && application_answers?.intendedCoverage) {
            final_face_amount = parseInt(String(application_answers.intendedCoverage).replace(/,/g, "")) * 100;
            console.log("Calculated final_face_amount:", final_face_amount);
        }

        if (formData.billing_mode || formData.monthly_premium || formData.start_date) {
            payment_map = {
                ...payment_map,
                billing_mode: formData.billing_mode || payment_map?.billing_mode || null,
                monthly_premium: formData.monthly_premium || payment_map?.monthly_premium || null,
                yearly_premium: formData.yearly_premium || payment_map?.yearly_premium || null,
                billing_schedule: formData.billing_schedule || payment_map?.billing_schedule || null,
                ssbb_payment_schedule: formData.ssbb_payment_schedule || payment_map?.ssbb_payment_schedule || null,
                start_date: formData.start_date || payment_map?.start_date || null,
            };
            console.log("Updated payment_map:", payment_map);
        }

        if (formData.price) {
            final_monthly_premium = parseInt(formData.price);
            final_yearly_premium = Math.round(final_monthly_premium / 0.086);
            payment_map = {
                billing_mode: "MONTHLY",
                monthly_premium: final_monthly_premium,
                yearly_premium: final_yearly_premium,
                billing_schedule: null,
                ssbb_payment_schedule: null,
                start_date: new Date().toISOString()
            };
            console.log("Set payment_map from price:", payment_map);
        }

        console.log("Final captured values before redirect:", {
            final_monthly_premium,
            final_yearly_premium,
            final_face_amount,
            payment_map
        });
    }

    let redirect;

    if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
        redirect =
            get_sales_medium() === "in_person"
                ? "/agent/969feace-a616-4fab-afc2-b48076eda9ef/checkout-signatures"
                : "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/checkout-signatures";
    } else {
        redirect =
            get_sales_medium() === "in_person"
                ? "/agent/969feace-a616-4fab-afc2-b48076eda9ef/checkout-signatures"
                : "/agent/virtual/ea6579b3-1912-4358-990c-5541b91a110b/checkout-signatures";
    }

    return new Response(null, {
        status: 204,
        headers: {
            "Content-Type": "text/html",
            "X-Remix-Redirect": redirect,
        },
    });
};


const handleCheckoutSignatureRequest = async ({ request }) => {
    const formData = Object.fromEntries(
        new URLSearchParams(await request.text())
    );
    if (
        formData.interactionId === "sign-docs-with-pin-checkout" ||
        formData.interactionId === "send-owner-pin"
    ) {
        save_answers(formData);
        virtual_notification_preference = formData.notificationPreference;
        if (formData.interactionId === "send-owner-pin" && application_type === "FINANCIAL_FOUNDATION_IUL_II") {
            self.clients
                .matchAll({ type: "window", includeUncontrolled: true })
                .then((clientList) => {
                    if (clientList.length > 0) {
                        // Send a message to the first client
                        clientList[0].postMessage({ action: "open-url", url: virtual_notification_preference == "TYPE_SMS" ? "https://app.getreprise.com/launch/G6YowMX/" : "https://app.getreprise.com/launch/zXP2MK6/" });
                    }
                });
        }
        else if (formData.interactionId === "send-owner-pin") {
            self.clients
                .matchAll({ type: "window", includeUncontrolled: true })
                .then((clientList) => {
                    if (clientList.length > 0) {
                        // Send a message to the first client
                        clientList[0].postMessage({ action: "open-url", url: virtual_notification_preference == "TYPE_SMS" ? "https://app.getreprise.com/launch/ZXB2qEX/" : "https://app.getreprise.com/launch/dyR29Ny/" });
                    }
                });
        }
        const res = {
            type: "state-success",
            interactionId: formData.interactionId,
            timestamp: 1760021290094,
            data:
                formData.interactionId === "sign-docs-with-pin-checkout"
                    ? {
                        formError: false,
                    }
                    : {
                        __typename: "CreatePinConsentsSuccess",
                        consents: [
                            {
                                id: "edceb249-f23f-439a-b638-edf0e700c227",
                                __typename: "CreateConsentSuccess",
                            },
                        ],
                        success: true,
                    },
        };
        return new Response(JSON.stringify(res), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        });
    }
    if (formData.interactionId === "sign-agent-docs") {
        // const redirect =
        //   "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/overview";
        const redirect =
            application_type === "FINANCIAL_FOUNDATION_IUL_II"
                ? "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/overview"
                : "/agent/virtual/ea6579b3-1912-4358-990c-5541b91a110b/overview";
        app_approved = true;
        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": redirect,
            },
        });
    }
};


// const handleContactRequest = async ({ request }) => {
//   const formData = Object.fromEntries(
//     new URLSearchParams(await request.text())
//   );
//   save_answers(formData);
//   if (formData.interactionId === "create-identity") {
//     const redirect =
//       "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/review-documents";
//     return new Response(null, {
//       status: 204,
//       headers: {
//         "Content-Type": "text/html",
//         "X-Remix-Redirect": redirect,
//       },
//     });
//   }
// };

// const handleReviewDocumentsRequest = async ({ request }) => {
//   const formData = Object.fromEntries(
//     new URLSearchParams(await request.text())
//   );
//   save_answers(formData);
//   if (formData.interactionId === "navigate-to-handoff-to-agent") {
//     const redirect =
//       "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/handoff-to-agent";
//     return new Response(null, {
//       status: 204,
//       headers: {
//         "Content-Type": "text/html",
//         "X-Remix-Redirect": redirect,
//       },
//     });
//   }
// };

const overview_pre_process_root = () => {
    return async (request) => {
        const url = new URL(request.url, location.href);
        const target_approval_type = {
            true: {
                //approved true
                FINANCIAL_FOUNDATION_IUL_II:
                    "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/overview?_data=root",
                FINAL_EXPENSE_EXPRESS_SOLUTION:
                    "/agent/virtual/ea6579b3-1912-4358-990c-5541b91a110b/overview?_data=root",
            },
            false: {
                FINANCIAL_FOUNDATION_IUL_II:
                    "/agent/iul/virtual/95e693b0-1bb5-4fa1-a605-cc78319757d2/overview?_data=root",
                FINAL_EXPENSE_EXPRESS_SOLUTION:
                    "/agent/virtual/fdc86577-f53e-4db5-a544-68cab58f17b9/overview?_data=root",
            },
        };
        const target = target_approval_type[app_approved][application_type];
        return new Request(url.toString(), {
            ...request,
            headers: {
                ...request.headers,
                "Explicit-Target": target,
            },
            method: request.method,
        });
    };
};

const overview_pre_process_routes = () => {
    return async (request) => {
        const url = new URL(request.url, location.href);
        const target_approval_type = {
            true: {
                FINANCIAL_FOUNDATION_IUL_II:
                    "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/overview?_data=routes/_main.$basePath.$",
                FINAL_EXPENSE_EXPRESS_SOLUTION:
                    "/agent/virtual/ea6579b3-1912-4358-990c-5541b91a110b/overview?_data=routes/_main.$basePath.$",
            },
            false: {
                FINANCIAL_FOUNDATION_IUL_II:
                    "/agent/iul/virtual/95e693b0-1bb5-4fa1-a605-cc78319757d2/overview?_data=routes/_main.$basePath.$",
                FINAL_EXPENSE_EXPRESS_SOLUTION:
                    "/agent/virtual/fdc86577-f53e-4db5-a544-68cab58f17b9/overview?_data=routes/_main.$basePath.$",
            },
        };
        const target = target_approval_type[app_approved][application_type];
        console.log("overview_pre_process_routes", "target", target);
        return new Request(url.toString(), {
            ...request,
            headers: {
                ...request.headers,
                "Explicit-Target": target,
            },
            method: request.method,
        });
    };
};

const approval_post_process = async (response) => {
    console.log("approval post process", application_answers, qoute_data);
    const body = await response.json();
    if (qoute_data.interactionId === "check-iul-eligibility")
        safe_set(
            body,
            "viewContext.iulIllustration.data",
            qoute_data?.latest_quote
        );
    body.viewContext.iulIllustration.data = qoute_data.latest_quote; // populates the same numbers as the approved quote
    body.viewContext.owner.first_name = application_answers.first_name.value;
    body.viewContext.owner.middle_name = application_answers.middle_name.value;
    body.viewContext.owner.last_name = application_answers.last_name.value;
    await replay_backend.storage.set("app_info", body);
    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

const overview_post_process = async (response) => {
    console.log("overview_post_process - Input data:", {
        payment_map,
        final_face_amount,
        final_yearly_premium,
        final_monthly_premium,
        bank_account_info_map,
        credit_card_info_map
    });

    const body = await response.json();

    // Log existing billing data to see what we're overwriting
    console.log("Existing billing data:", body?.viewContext?.agentOverviewTableData?.policy?.billing);

    // Set owner information
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.owner.name.first",
        application_answers.first_name.value
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.owner.name.last",
        application_answers.last_name.value
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.owner.email",
        application_answers.primary_email.value
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.owner.phones.0.number",
        application_answers.phone.value
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.owner.addresses.0.street1",
        application_answers.stateless_address.value.street_1
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.owner.addresses.0.city",
        application_answers.stateless_address.value.city
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.owner.addresses.0.postalCode",
        application_answers.stateless_address.value.postal_code
    );

    // Set insured information
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.insured.name.first",
        application_answers.first_name.value
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.insured.name.last",
        application_answers.last_name.value
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.insured.email",
        application_answers.primary_email.value
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.insured.phones.0.number",
        application_answers.phone.value
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.insured.addresses.0.street1",
        application_answers.stateless_address.value.street_1
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.insured.addresses.0.city",
        application_answers.stateless_address.value.city
    );
    safe_set(
        body,
        "viewContext.agentOverviewTableData.policy.insured.addresses.0.postalCode",
        application_answers.stateless_address.value.postal_code
    );

    // Calculate face amount - prioritize final_face_amount, then application answers, then quote data
    const faceAmountCents = final_face_amount ||
        (application_answers?.intendedCoverage ? parseInt(String(application_answers.intendedCoverage).replace(/,/g, "")) * 100 : null) ||
        qoute_data?.latest_quote?.initialDeathBenefitCents;

    if (faceAmountCents) {
        safe_set(body, "viewContext.policy.pricingDetails.faceAmountCents", faceAmountCents);
        safe_set(body, "viewContext.policy.application.applicationMetaData.initialFaceValue", faceAmountCents);
        safe_set(body, "viewContext.agentOverviewTableData.policy.pricingDetails.faceAmountCents", faceAmountCents);
        safe_set(body, "viewContext.associatedQuote.coverage.face_amount_cents", faceAmountCents);
        safe_set(body, "viewContext.applicationMetadata.initial_face_value", parseInt(faceAmountCents) / 100);
    }

    // Set premium amounts - prioritize final values over quote data
    const yearlyPremiumCents = final_yearly_premium ||
        payment_map?.yearly_premium ||
        (qoute_data?.latest_quote?.initialMonthlyPremiumCents ? qoute_data.latest_quote.initialMonthlyPremiumCents * 12 : null);

    const monthlyPremiumCents = final_monthly_premium ||
        payment_map?.monthly_premium ||
        qoute_data?.latest_quote?.initialMonthlyPremiumCents;

    if (yearlyPremiumCents) {
        safe_set(body, "viewContext.policy.pricingDetails.annualPremiumCents", yearlyPremiumCents.toString());
        safe_set(body, "viewContext.agentOverviewTableData.policy.annualPremiumCents", yearlyPremiumCents);
        safe_set(body, "viewContext.agentOverviewTableData.policy.pricingDetails.annualPremiumCents", yearlyPremiumCents);
    }

    if (monthlyPremiumCents) {
        safe_set(body, "viewContext.agentOverviewTableData.policy.grossModalPremiumCents", monthlyPremiumCents);
        safe_set(body, "viewContext.agentOverviewTableData.policy.pricingDetails.monthlyPremiumCents", monthlyPremiumCents);
    }

    // Set policy promise reasons
    safe_set(body, "viewContext.policyPromiseData.policy.application.reasons", [
        "Medical history of cancer",
        "Scuba activity as disclosed on the application"
    ]);

    // ===== CRITICAL PAYMENT METHOD FIX =====
    // The issue is that the response may already contain billing.defaultPaymentMethod with card data
    // We need to FORCE overwrite it with our bank account data

    if (bank_account_info_map && bank_account_info_map.id) {
        console.log("FORCING bank account payment method:", bank_account_info_map);

        // Build the complete payment method object
        const paymentMethodDetails = {
            "__typename": "PaymentMethod",
            "id": bank_account_info_map.id,
            "type": bank_account_info_map.method_type,
            "details": {
                "__typename": "BankAccountDetails",
                "type": "bankAccount",
                "last4": bank_account_info_map.last4,
                "bankName": bank_account_info_map.bank_name
            }
        };

        // Get billing mode - use payment_map if available, otherwise default
        const billingMode = payment_map?.billing_mode || "MONTHLY";

        // DIRECT ASSIGNMENT - Don't use safe_set because it won't create the path
        if (!body.viewContext.agentOverviewTableData.policy.billing) {
            body.viewContext.agentOverviewTableData.policy.billing = {};
        }

        // Completely overwrite the billing object
        body.viewContext.agentOverviewTableData.policy.billing = {
            "__typename": "BillingSubscription",
            "mode": billingMode,
            "subscriptionId": body.viewContext.agentOverviewTableData.policy.billing.subscriptionId || "7fd1fcca-7cab-4b57-8a20-020d5ba7d660",
            "items": [
                {
                    "__typename": "SubscriptionItem",
                    "monthlyAmount": monthlyPremiumCents || 0,
                    "yearlyAmount": yearlyPremiumCents || 0
                }
            ],
            "defaultPaymentMethod": paymentMethodDetails
        };

        console.log("New billing data set:", body.viewContext.agentOverviewTableData.policy.billing);

        // Also set bind details for payment schedule display
        if (payment_map?.start_date) {
            const bindDetails = {
                mode: billingMode,
                startDate: payment_map.start_date
            };

            // Add SSBB details if applicable
            if (payment_map.billing_schedule === "SOCIAL_SECURITY_PAYMENT" && payment_map.ssbb_payment_schedule) {
                bindDetails.modeDetails = {
                    ssbb: true
                };

                if (["SECOND_WEDNESDAY", "THIRD_WEDNESDAY", "FOURTH_WEDNESDAY"].includes(payment_map.ssbb_payment_schedule)) {
                    bindDetails.mode = "MONTHLY_WEEKDAY";
                    const ordinal = payment_map.ssbb_payment_schedule === "SECOND_WEDNESDAY" ? 2 :
                        payment_map.ssbb_payment_schedule === "THIRD_WEDNESDAY" ? 3 : 4;
                    bindDetails.modeDetails.monthlyWeekday = {
                        ordinal: ordinal,
                        weekday: 3
                    };
                }
            }

            if (!body.viewContext.agentOverviewTableData.policy.bindDetails) {
                body.viewContext.agentOverviewTableData.policy.bindDetails = {};
            }
            body.viewContext.agentOverviewTableData.policy.bindDetails = bindDetails;
        }
    }
    else if (credit_card_info_map && credit_card_info_map.id) {
        console.log("FORCING credit card payment method:", credit_card_info_map);

        const paymentMethodDetails = {
            "__typename": "PaymentMethod",
            "id": credit_card_info_map.id,
            "type": credit_card_info_map.method_type || "CARD",
            "details": {
                "__typename": "CardDetails",
                "type": "card",
                "last4": credit_card_info_map.last4,
                "brand": credit_card_info_map.brand || "visa"
            }
        };

        const billingMode = payment_map?.billing_mode || "MONTHLY";

        if (!body.viewContext.agentOverviewTableData.policy.billing) {
            body.viewContext.agentOverviewTableData.policy.billing = {};
        }

        body.viewContext.agentOverviewTableData.policy.billing = {
            "__typename": "BillingSubscription",
            "mode": billingMode,
            "subscriptionId": body.viewContext.agentOverviewTableData.policy.billing.subscriptionId || "7fd1fcca-7cab-4b57-8a20-020d5ba7d660",
            "items": [
                {
                    "__typename": "SubscriptionItem",
                    "monthlyAmount": monthlyPremiumCents || 0,
                    "yearlyAmount": yearlyPremiumCents || 0
                }
            ],
            "defaultPaymentMethod": paymentMethodDetails
        };

        console.log("New billing data set:", body.viewContext.agentOverviewTableData.policy.billing);
    }
    else {
        console.warn("No payment method data available (neither bank_account_info_map nor credit_card_info_map)");
    }

    // Final fallback for applicationMetaData
    if (body?.viewContext?.policy?.application?.applicationMetaData) {
        body.viewContext.policy.application.applicationMetaData.initialFaceValue =
            application_answers?.intendedCoverage;
    }

    console.log("overview_post_process - Complete");
    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

const fe_approval_post_process_routes = async (response) => {
    const body = await response.json();
    safe_set(
        body,
        "viewContext.associatedQuote.face_amount",
        application_answers?.intendedCoverage?.replace(/,/g, "")
    );
    safe_set(
        body,
        "viewContext.policy.payor.name.first",
        application_answers?.first_name.value
    );
    safe_set(
        body,
        "viewContext.policy.payor.name.last",
        application_answers?.last_name.value
    );
    safe_set(
        body,
        "viewContext.owner.first_name",
        application_answers?.first_name.value
    );
    safe_set(
        body,
        "viewContext.owner.last_name",
        application_answers?.last_name.value
    );
    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

function getNextNthWednesday(n) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // Convert to 1-based month

    // Function to calculate nth Wednesday of a given month
    function getNthWednesdayOfMonth(year, month, n) {
        const firstDay = new Date(year, month - 1, 1);
        const firstDayOfWeek = firstDay.getDay();
        const daysToFirstWednesday = (3 - firstDayOfWeek + 7) % 7;
        const nthWednesday = new Date(year, month - 1, 1 + daysToFirstWednesday + (n - 1) * 7);
        nthWednesday.setUTCHours(8, 0, 0, 0);
        return nthWednesday;
    }

    // Try current month first
    let targetWednesday = getNthWednesdayOfMonth(currentYear, currentMonth, n);

    // If the Wednesday has already passed or is today, move to next month
    if (targetWednesday <= today) {
        let nextMonth = currentMonth + 1;
        let nextYear = currentYear;

        // Handle year rollover
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }

        targetWednesday = getNthWednesdayOfMonth(nextYear, nextMonth, n);
    }

    return targetWednesday.toISOString();
}

const fe_checkout_details_post_process_routes = async (response) => {
    console.log("in the fe_checkout_details_post_process_routes")
    const body = await response.json();
    console.log("response: ", body);
    safe_set(body, "viewContext.policy.beneficiaries", []);
    safe_set(
        body,
        "viewContext.policy.pricingDetails.faceAmountCents",
        application_answers?.intendedCoverage?.replace(/,/g, "") * 100
    );
    safe_set(
        body,
        "viewContext.policy.application.applicationMetaData.initialFaceValue",
        application_answers?.intendedCoverage?.replace(/,/g, "")
    );
    safe_set(
        body,
        "viewContext.associatedQuote.face_amount",
        application_answers?.intendedCoverage?.replace(/,/g, "")
    );
    if (body?.viewContext?.pricing?.rates[0]?.prices[0]?.face_amount?.cents) {
        body.viewContext.pricing.rates[0].prices[0].face_amount.cents =
            application_answers?.intendedCoverage?.replace(/,/g, "") * 100;
    }
    console.log("final_yearly_premium: ", final_yearly_premium);
    if (body?.viewContext?.pricing?.rates[0]?.prices[0] && final_yearly_premium && final_monthly_premium && final_face_amount) {
        body.viewContext.pricing.rates[0].prices[0].face_amount.cents = final_face_amount;
        body.viewContext.pricing.rates[0].prices[0].premium_monthly.cents = final_monthly_premium;
        body.viewContext.pricing.rates[0].prices[0].premium_yearly.cents = final_yearly_premium;
    }
    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

/**
 * To generate an expiry date for the coverage plan in fe_checkout_payment_post_process
 */
function getTomorrowTimestamp() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const [datePart, timePart] = tomorrow.toISOString().split('.');
    const milliseconds = timePart.slice(0, 3); // e.g., "384"
    const extraNanos = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
    return `${datePart}.${milliseconds}${extraNanos}Z`;
}

const fe_checkout_payment_post_process = async (response) => {
    let body = await response.json();
    body = populate_answers(body);

    // fixing error on payments page that sets scheduled payment to an earlier date
    const timestamp = getTomorrowTimestamp();
    // safe_set(body, "viewContext.policy.bindDetails.startDate", timestamp);

    // safe_set(body, "viewContext.iulIllustration.data", qoute_data.latest_quote);
    safe_set(
        body,
        "viewContext.owner.first_name",
        application_answers?.first_name?.value
    );
    safe_set(
        body,
        "viewContext.owner.last_name",
        application_answers?.last_name?.value
    );
    safe_set(body, "viewContext.billingAddress", {
        street_1: application_answers?.stateless_address?.value?.street_1,
        city: application_answers?.stateless_address?.value?.city,
        state: application_answers?.unchangeable_state?.value,
        postal_code: application_answers?.stateless_address?.value?.postal_code,
    });
    safe_set(body, "viewContext.owner.address", {
        street_1: application_answers?.stateless_address?.value?.street_1,
        street_2: application_answers?.stateless_address?.value?.street_2 || "",
        city: application_answers?.stateless_address?.value?.city,
        state: application_answers?.unchangeable_state?.value,
        postal_code: application_answers?.stateless_address?.value?.postal_code,
    });
    const addresses = [];
    addresses.push({
        street_1: application_answers?.stateless_address?.value?.street_1,
        street_2: application_answers?.stateless_address?.value?.street_2 || "",
        city: application_answers?.stateless_address?.value?.city,
        state: application_answers?.unchangeable_state?.value,
        postal_code: application_answers?.stateless_address?.value?.postal_code,
        address_type: "PHYSICAL"
    });

    // Add mailing address if it exists
    if (application_answers?.mailing_address) {
        addresses.push({
            street_1: application_answers.mailing_address.value?.street_1 || "",
            street_2: application_answers.mailing_address.value?.street_2 || "",
            city: application_answers.mailing_address.value?.city || "",
            state: application_answers.mailing_address.value?.state || "",
            postal_code: application_answers.mailing_address.value?.postal_code || "",
            address_type: "MAILING"
        });
    }
    safe_set(body, "viewContext.owner.addresses", addresses);

    console.log("final_yearly_premium payments: ", final_yearly_premium);
    if (body?.viewContext?.pricing?.rates[0]?.prices[0] && final_yearly_premium && final_monthly_premium && final_face_amount) {
        body.viewContext.pricing.rates[0].prices[0].face_amount.cents = final_face_amount;
        body.viewContext.pricing.rates[0].prices[0].premium_monthly.cents = final_monthly_premium;
        body.viewContext.pricing.rates[0].prices[0].premium_yearly.cents = final_yearly_premium;
    }

    if (payment_map) {
        body.viewContext.policy.bindDetails.mode = payment_map.billing_mode;
        body.viewContext.policy.bindDetails.startDate = payment_map.start_date;
        if (payment_map.billing_schedule === "SOCIAL_SECURITY_PAYMENT") {
            body.viewContext.policy.bindDetails.modeDetails.ssbb = true;
            if (["SECOND_WEDNESDAY", "THIRD_WEDNESDAY", "FOURTH_WEDNESDAY"].includes(payment_map.ssbb_payment_schedule)) {
                body.viewContext.policy.bindDetails.mode = "MONTHLY_WEEKDAY";
                const ordinal = payment_map.ssbb_payment_schedule === "SECOND_WEDNESDAY" ? 2 : payment_map.ssbb_payment_schedule === "THIRD_WEDNESDAY" ? 3 : 4;
                body.viewContext.policy.bindDetails.modeDetails.monthlyWeekday.ordinal = ordinal;
                body.viewContext.policy.bindDetails.modeDetails.monthlyWeekday.weekday = 3;
                body.viewContext.policy.bindDetails.startDate = getNextNthWednesday(ordinal);
            }
        }
    }

    if (secondary_contact_map) {
        body.viewContext.policy.secondaryContact = {
            "__typename": "ContactDetails",
            "name": {
                "__typename": "FullName",
                "first": secondary_contact_map.first,
                "last": secondary_contact_map.last
            },
            "address": {
                "__typename": "Address",
                "street1": secondary_contact_map.street_1,
                "street2": secondary_contact_map.street_2,
                "city": secondary_contact_map.city,
                "state": secondary_contact_map.state,
                "postalCode": secondary_contact_map.postal_code
            },
            "phone": secondary_contact_map.phone,
            "email": secondary_contact_map.email
        }
    }

    if (bank_account_info_map) {
        const date = new Date(application_answers?.birth_date?.value);

        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const payment_method_object = {
            "id": bank_account_info_map.id,
            "method_type": bank_account_info_map.method_type,
            "bank_account": {
                "bank_name": bank_account_info_map.bank_name,
                "last4": bank_account_info_map.last4,
                "account_type": bank_account_info_map.account_type,
                "account_number_token": bank_account_info_map.account_number_token,
                "routing_number": bank_account_info_map.routing_number
            },
            "billing_name": application_answers?.first_name?.value + " " + application_answers?.last_name?.value,
            "billing_address": {
                "street_1": application_answers?.stateless_address?.value?.street_1,
                "street_2": application_answers?.stateless_address?.value?.street_2 || "",
                "city": application_answers?.stateless_address?.value?.city,
                "state": application_answers?.unchangeable_state?.value,
                "country": "us",
                "postal_code": application_answers?.stateless_address?.value?.postal_code,
                "address_type": "UNKNOWN"
            },
            "billing_relationship": "self",
            "billing_date_of_birth": {
                "year": year,
                "month": month,
                "day": day
            },
            "billing_email": application_answers?.primary_email.value || "",
            "merchant_account": "MACCT_ADYEN_PLATFORM",
            "owner_id": {
                "value": "776cf7fe-a2a9-46cb-b6d4-310eb55690f8"
            },
            "intent_id": {
                "value": "131a11da-c1ff-41b0-9c71-67186e601f19"
            },
            "unusable": false
        }
        safe_set(body, "viewContext.billing.subscription.payment_methods", [payment_method_object]);
        safe_set(body, "viewContext.billing.subscription.default_payment_method_id", bank_account_info_map.id);
        safe_set(body, "viewContext.billing.subscription.default_payment_method", payment_method_object);
    }

    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

const fe_checkout_signatures_post_process = async (response) => {
    console.log("fe_checkout_signatures_post_process was called")
    let body = await response.json();

    const firstName = application_answers.first_name.value;
    const lastName = application_answers.last_name.value;
    const middleName = application_answers.middle_name.value || "";

    const signaure = {
        actor_entity: {
            id: { value: "b42cf505-49a8-4e47-aba1-53a0f4833146" },
            entity_type: "CUSTOMER",
        },
        signed_at: "2025-10-22T15:52:18Z",
        viewed_at: "2025-10-22T15:52:18Z",
        ip_address: "2601:197:500:5d10:6c79:94f0:1ddf:8495",
        name: {
            first: firstName,
            last: lastName,
            middle: middleName,
            suffix: "",
        },
        source: "AFTON, TX",
        action_source: "REQUEST",
    };

    console.log("checkout signatures state", checkout_signatures_state);
    if (checkout_signatures_state > 1 ) {
        safe_set(
            body,
            "viewContext.applicationPartTwoDocumentsNoForceCreate.0.metadata.signatures",
            [signaure]
        );
        safe_set(
            body,
            "viewContext.applicationPartTwoDocumentsNoForceCreateAgent.0.metadata.signatures",
            [signaure]
        );
    }

    // Set all possible name field paths that might be used for display
    // Owner fields
    safe_set(body, "viewContext.owner.first_name", firstName);
    safe_set(body, "viewContext.owner.last_name", lastName);
    safe_set(body, "viewContext.owner.middle_name", middleName);

    // Insured fields  
    safe_set(body, "viewContext.insured.first_name", firstName);
    safe_set(body, "viewContext.insured.last_name", lastName);
    safe_set(body, "viewContext.insured.middle_name", middleName);

    // Policy owner name fields
    safe_set(body, "viewContext.policy.owner.name.first", firstName);
    safe_set(body, "viewContext.policy.owner.name.last", lastName);
    safe_set(body, "viewContext.policy.owner.name.middle", middleName);

    // Policy payor name fields
    safe_set(body, "viewContext.policy.payor.name.first", firstName);
    safe_set(body, "viewContext.policy.payor.name.last", lastName);
    safe_set(body, "viewContext.policy.payor.name.middle", middleName);

    // Policy insured name fields
    safe_set(body, "viewContext.policy.insured.name.first", firstName);
    safe_set(body, "viewContext.policy.insured.name.last", lastName);
    safe_set(body, "viewContext.policy.insured.name.middle", middleName);

    body = populate_answers(body);
    body = populate_enriched_application(body);
    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

const checkout_details_post_process = async (response) => {
    const body = await response.json();
    body.viewContext.iulIllustration.data = qoute_data.latest_quote;
    body.viewContext.policy.additionalApplicationData = additional_data;
    if (beneficiaries.length === 0) {
        body.viewContext.policy.beneficiaries = [];
    } else {
        body.viewContext.policy.beneficiaries = beneficiaries;
    }
    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

const checkout_payment_post_process = async (response) => {
    let body = await response.json();
    body = populate_answers(body);
    body.viewContext.iulIllustration.data = qoute_data.latest_quote; // populates the same numbers as the approved quote
    body.viewContext.owner.first_name = application_answers.first_name.value;
    body.viewContext.owner.last_name = application_answers.last_name.value;
    body.viewContext.billingAddress = {
        street_1: application_answers.stateless_address.value.street_1,
        city: application_answers.stateless_address.value.city,
        state: application_answers.unchangeable_state.value,
        postal_code: application_answers.stateless_address.value.postal_code,
    };
    const salesMedium = get_sales_medium();
    if (salesMedium === "in_person") {
        if (bank_account_info_map) {
            const date = new Date(application_answers?.birth_date?.value);
            const year = date.getUTCFullYear();
            const month = date.getUTCMonth() + 1;
            const day = date.getUTCDate();

            const payment_method_object = {
                "id": bank_account_info_map.id,
                "method_type": bank_account_info_map.method_type,
                "bank_account": {
                    "bank_name": bank_account_info_map.bank_name,
                    "last4": bank_account_info_map.last4,
                    "account_type": bank_account_info_map.account_type,
                    "account_number_token": bank_account_info_map.account_number_token,
                    "routing_number": bank_account_info_map.routing_number
                },
                "billing_name": application_answers?.first_name?.value + " " + application_answers?.last_name?.value,
                "billing_address": {
                    "street_1": application_answers?.stateless_address?.value?.street_1,
                    "street_2": application_answers?.stateless_address?.value?.street_2 || "",
                    "city": application_answers?.stateless_address?.value?.city,
                    "state": application_answers?.unchangeable_state?.value,
                    "country": "us",
                    "postal_code": application_answers?.stateless_address?.value?.postal_code,
                    "address_type": "UNKNOWN"
                },
                "billing_relationship": "self",
                "billing_date_of_birth": {
                    "year": year,
                    "month": month,
                    "day": day
                },
                "billing_email": application_answers?.primary_email.value || "",
                "merchant_account": "MACCT_ADYEN_PLATFORM",
                "owner_id": {
                    "value": "776cf7fe-a2a9-46cb-b6d4-310eb55690f8"
                },
                "intent_id": {
                    "value": "131a11da-c1ff-41b0-9c71-67186e601f19"
                },
                "unusable": false
            };

            safe_set(body, "viewContext.billing.subscription.payment_methods", [payment_method_object]);
            safe_set(body, "viewContext.billing.subscription.default_payment_method_id", bank_account_info_map.id);
            safe_set(body, "viewContext.billing.subscription.default_payment_method", payment_method_object);
        }
    }

    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

const fe_checkout_review_post_process = async (response) => {
    if (beneficiaries.length === 0) {
        safe_set(body, "viewContext.policy.beneficiaries", []);
    }
    passed_review = true; // used in FE pricing snippet
    let body = await response.json();
    body = populate_answers(body);
    body = populate_enriched_application(body);
    console.log("fe_checkout_review_post_process called");

    const firstName = application_answers.first_name.value;
    const lastName = application_answers.last_name.value;

    safe_set(body, "viewContext.insured.first_name", firstName);
    safe_set(body, "viewContext.insured.last_name", lastName);
    safe_set(body, "viewContext.owner.first_name", firstName);
    safe_set(body, "viewContext.owner.last_name", lastName);

    // Coverage Details
    safe_set(body, "viewContext.policy.apl", apl === "enabled" ? true : false);
    if (body?.viewContext?.pricing?.rates[0]?.prices[0]?.face_amount?.cents) {
        body.viewContext.pricing.rates[0].prices[0].face_amount.cents =
            application_answers?.intendedCoverage?.replace(/,/g, "") * 100;
    }

    if (body?.viewContext?.pricing?.rates[0]?.prices[0] && final_yearly_premium && final_monthly_premium && final_face_amount) {
        body.viewContext.pricing.rates[0].prices[0].face_amount.cents = final_face_amount;
        body.viewContext.pricing.rates[0].prices[0].premium_monthly.cents = final_monthly_premium;
        body.viewContext.pricing.rates[0].prices[0].premium_yearly.cents = final_yearly_premium;
    }

    // Payment Schedule - DEFENSIVE NULL CHECKS
    console.log("payment_map in review:", payment_map);

    if (payment_map && payment_map.billing_mode) {
        console.log("Setting payment schedule from payment_map");
        body.viewContext.policy.bindDetails.mode = payment_map.billing_mode;
        body.viewContext.policy.bindDetails.startDate = payment_map.start_date;

        if (payment_map.billing_schedule === "SOCIAL_SECURITY_PAYMENT") {
            body.viewContext.policy.bindDetails.modeDetails.ssbb = true;
            if (["SECOND_WEDNESDAY", "THIRD_WEDNESDAY", "FOURTH_WEDNESDAY"].includes(payment_map.ssbb_payment_schedule)) {
                body.viewContext.policy.bindDetails.mode = "MONTHLY_WEEKDAY";
                const ordinal = payment_map.ssbb_payment_schedule === "SECOND_WEDNESDAY" ? 2 :
                    payment_map.ssbb_payment_schedule === "THIRD_WEDNESDAY" ? 3 : 4;
                body.viewContext.policy.bindDetails.modeDetails.monthlyWeekday.ordinal = ordinal;
                body.viewContext.policy.bindDetails.modeDetails.monthlyWeekday.weekday = 3;
                body.viewContext.policy.bindDetails.startDate = getNextNthWednesday(ordinal);
            }
        }
    } else {
        console.warn("payment_map is null or missing billing_mode, using defaults");
        // Try to get billing mode from existing body data
        const existingMode = body?.viewContext?.policy?.bindDetails?.mode;
        if (existingMode) {
            console.log("Using existing billing mode:", existingMode);
        } else {
            console.warn("No billing mode available, defaulting to MONTHLY");
            safe_set(body, "viewContext.policy.bindDetails.mode", "MONTHLY");
        }
    }

    // Beneficiaries
    console.log("beneficiaries: ", beneficiaries);
    safe_set(body, "viewContext.policy.beneficiaries", beneficiaries);

    // Billing Information/Payment Details - DEFENSIVE NULL CHECKS
    if (bank_account_info_map && bank_account_info_map.id) {
        console.log("Setting bank account payment method");
        const date = new Date(application_answers?.birth_date?.value);
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();

        const payment_method_object = {
            "id": bank_account_info_map.id,
            "method_type": bank_account_info_map.method_type,
            "bank_account": {
                "bank_name": bank_account_info_map.bank_name,
                "last4": bank_account_info_map.last4,
                "account_type": bank_account_info_map.account_type,
                "account_number_token": bank_account_info_map.account_number_token,
                "routing_number": bank_account_info_map.routing_number
            },
            "billing_name": application_answers?.first_name?.value + " " + application_answers?.last_name?.value,
            "billing_address": {
                "street_1": application_answers?.stateless_address?.value?.street_1,
                "street_2": application_answers?.stateless_address?.value?.street_2 || "",
                "city": application_answers?.stateless_address?.value?.city,
                "state": application_answers?.unchangeable_state?.value,
                "country": "us",
                "postal_code": application_answers?.stateless_address?.value?.postal_code,
                "address_type": "UNKNOWN"
            },
            "billing_relationship": "self",
            "billing_date_of_birth": {
                "year": year,
                "month": month,
                "day": day
            },
            "billing_email": application_answers?.primary_email.value || "",
            "merchant_account": "MACCT_ADYEN_PLATFORM",
            "owner_id": {
                "value": "776cf7fe-a2a9-46cb-b6d4-310eb55690f8"
            },
            "intent_id": {
                "value": "131a11da-c1ff-41b0-9c71-67186e601f19"
            },
            "unusable": false
        };

        safe_set(body, "viewContext.billing.subscription.payment_methods", [payment_method_object]);
        safe_set(body, "viewContext.billing.subscription.default_payment_method_id", bank_account_info_map.id);
        safe_set(body, "viewContext.billing.subscription.default_payment_method", payment_method_object);
        safe_set(body, "viewContext.billingAddress", {
            "street_1": application_answers?.stateless_address?.value?.street_1,
            "street_2": application_answers?.stateless_address?.value?.street_2 || "",
            "city": application_answers?.stateless_address?.value?.city,
            "state": application_answers?.unchangeable_state?.value,
            "postal_code": application_answers?.stateless_address?.value?.postal_code,
        });
    } else {
        console.warn("bank_account_info_map is null or missing id");
    }

    // Summary - DEFENSIVE NULL CHECKS
    const modalPremium = payment_map?.billing_mode === "ANNUAL"
        ? (final_yearly_premium || 0)
        : (final_monthly_premium || 0);

    console.log("Setting modal premium:", modalPremium);
    safe_set(body, "viewContext.policy.bindDetails.modalPremiumCents", modalPremium);

    if (final_face_amount) {
        safe_set(body, "viewContext.policy.pricingDetails.faceAmountCents", final_face_amount);
    } else {
        console.warn("final_face_amount is not set");
    }

    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

const filter_interaction_id = (interaction_id) => {
    return (request, body) => {
        const formData = Object.fromEntries(new URLSearchParams(body));
        return formData.interactionId === interaction_id;
    };
};

const filter_underwriting_state = () => {
    return (request) => {
        return (
            new URL(request.url).searchParams.get("_data") ===
            "routes/_main.$basePath.$" && underwriting_state === 0
        );
    };
};

const redirect_to_url = (redirects) => {
    return async ({ request }) => {
        const formData = Object.fromEntries(
            new URLSearchParams(await request.text())
        );
        save_answers(formData);
        for (const [interactionId, redirect_cb] of Object.entries(redirects)) {
            if (formData.interactionId === interactionId) {
                const redirect = redirect_cb();
                return new Response(null, {
                    status: 204,
                    headers: {
                        "Content-Type": "text/html",
                        "X-Remix-Redirect": redirect,
                    },
                });
            }
        }
        console.error("no interaction id matched");
        return new Response(null, {
            status: 204,
            headers: {
                "Content-Type": "text/html",
                "X-Remix-Redirect": "/agent/dashboard",
            },
        });
    };
};

const explicit_target = (explicit_target, cb) => {
    return async (request) => {
        const url = new URL(request.url, location.href);
        if (cb) cb();
        return new Request(url.toString(), {
            ...request,
            headers: {
                ...request.headers,
                "Explicit-Target":
                    typeof explicit_target === "function"
                        ? explicit_target()
                        : explicit_target,
            },
            method: request.method,
        });
    };
};

const populate = async (response) => {
    let body = await response.json();
    body = populate_answers(body);
    body = populate_enriched_application(body);
    return new Blob([JSON.stringify(body)], { type: "application/json" });
};

const requests_obj_fe_inperson = [
    {
        method: "GET",
        url: "/agent/:id/consent",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/consent?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/consent",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/consent?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/replacements",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/replacements?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/personal",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/personal?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/personal",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/personal?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/:id/medical",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/medical?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/medical",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/medical?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/:id/lifestyle",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/lifestyle?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/lifestyle",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/lifestyle?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/:id/contact",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/contact?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/contact",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/contact?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition: "/contact?_data=routes%2F_main.%24basePath.%24",
        handler: redirect_to_url({
            "create-identity": () => application_type === "FINANCIAL_FOUNDATION_IUL_II"
                ? "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/review-documents" :
                "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/review-documents",
        }),
    },
    {
        method: "POST",
        register_route: true,
        interception_condition:
            "/review-documents?_data=routes%2F_main.%24basePath.%24",
        handler: redirect_to_url({
            "sign-docs-and-submit": () =>
                application_type === "FINANCIAL_FOUNDATION_IUL_II"
                    ? "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/handoff-to-agent" :
                    "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/handoff-to-agent",
        }),
    },
    {
        method: "GET",
        url: "/agent/:id/review-documents",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/review-documents?_data=routes/_main.$basePath.$"
        ),
        post_process: populate
    },
    {
        method: "GET",
        url: "/agent/:id/handoff-to-applicant",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/handoff-to-applicant?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/handoff-to-applicant",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/handoff-to-applicant?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/:id/handoff-to-agent",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/handoff-to-agent?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/:id/agent-commission-disclosures",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/agent-commission-disclosures?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/agent-commission-disclosures",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/agent-commission-disclosures?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        url: "/agent/:id/agent-commission-disclosures",
        interception_condition: filter_interaction_id("commission-complete"),
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/agent-commission-disclosures?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/agent-review-documents",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/agent-review-documents?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/agent-review-documents",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/agent-review-documents?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    // {
    //     method: "POST",
    //     url: "/agent/:id/underwriting",
    //     interception_condition: filter_underwriting_state(),
    //     pre_process: explicit_target(
    //         "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/underwriting?_data=routes/_main.$basePath.$",
    //         () => {
    //             underwriting_state++
    //         }
    //     ),
    // },
    {
        method: "GET",
        url: "/agent/:id/overview",
        interception_condition: "root",
        pre_process: overview_pre_process_root(),
    },
    {
        method: "GET",
        url: "/agent/:id/overview",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: overview_pre_process_routes(),
        post_process: overview_post_process,
    },
    {
        method: "GET",
        url: "/agent/:id/approval",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/2a14742e-57cb-4b50-8fcb-793b1e3b3625/approval?_data=routes/_main.$basePath.$"
        ),
        post_process: fe_approval_post_process_routes,
    },
    {
        method: "GET",
        url: "/agent/:id/checkout-details",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(() => {
            // Dynamically determine the correct target based on the application type and sales medium
            const salesMedium = get_sales_medium();
            if (application_type === "FINANCIAL_FOUNDATION_IUL_II") {
                return salesMedium === "in_person"
                    ? "/agent/iul/72414f8f-4909-466d-b6ae-4ca92983afd5/checkout-details?_data=routes/_main.$basePath.$"
                    : "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/checkout-details?_data=routes/_main.$basePath.$";
            } else {
                // For FE (FINAL_EXPENSE_EXPRESS_SOLUTION)
                return salesMedium === "in_person"
                    ? "/agent/969feace-a616-4fab-afc2-b48076eda9ef/checkout-details?_data=routes/_main.$basePath.$"
                    : "/agent/virtual/ea6579b3-1912-4358-990c-5541b91a110b/checkout-details?_data=routes/_main.$basePath.$";
            }
        }),
        post_process: fe_checkout_details_post_process_routes,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition: "/checkout-payment?_data=routes%2F_main.%24basePath.%24",
        handler: handleCheckoutPaymentRequest,
    },
    {
        method: "GET",
        url: "/agent/:id/checkout-payment",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/969feace-a616-4fab-afc2-b48076eda9ef/checkout-payment?_data=routes/_main.$basePath.$"
        ),
        post_process: fe_checkout_payment_post_process,
    },
    {
        method: "GET",
        url: "/agent/:id/checkout-signatures",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/969feace-a616-4fab-afc2-b48076eda9ef/checkout-signatures?_data=routes/_main.$basePath.$",
            () => {
                console.log(
                    "checkout signatures state in pre process",
                    checkout_signatures_state
                );
                checkout_signatures_state++;
            }
        ),
        post_process: fe_checkout_signatures_post_process,
    }, {
        method: "POST",
        register_route: true,
        interception_condition: "/checkout-signatures?_data=routes%2F_main.%24basePath.%24",
        handler: handleCheckoutSignatureRequest,
    },
    {
        method: "GET",
        url: "/agent/:id/checkout-review",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/969feace-a616-4fab-afc2-b48076eda9ef/checkout-review?_data=routes/_main.$basePath.$",
        ),
        post_process: fe_checkout_review_post_process,
    },
];



const requests_obj_fe = [
    {
        method: "GET",
        url: "/agent/virtual/:id/consent",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/consent?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/consent",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/consent?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/personal",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/personal?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/personal",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/personal?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/medical",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/medical?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/medical",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/medical?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/lifestyle",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/lifestyle?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/lifestyle",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/lifestyle?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/document-pin-handoff",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/document-pin-handoff?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/document-pin-handoff",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/document-pin-handoff?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/sign-with-pin",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/sign-with-pin?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/sign-with-pin",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/sign-with-pin?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/agent-review-documents",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/agent-review-documents?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/agent-review-documents",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/agent-review-documents?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        url: "/agent/virtual/:id/agent-commission-disclosures",
        interception_condition: filter_interaction_id("commission-complete"),
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/agent-commission-disclosures?_data=routes/_main.$basePath.$"
        ),
    },
    // {
    //     method: "POST",
    //     url: "/agent/virtual/:id/underwriting",
    //     interception_condition: filter_underwriting_state(),
    //     pre_process: explicit_target(
    //         "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/underwriting?_data=routes/_main.$basePath.$",
    //         () => {
    //             underwriting_state++
    //         }
    //     ),
    // },
    {
        method: "GET",
        url: "/agent/virtual/:id/overview",
        interception_condition: "root",
        pre_process: overview_pre_process_root(),
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/overview",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: overview_pre_process_routes(),
        post_process: overview_post_process,
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/approval",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/2097a327-4a28-4fb5-a19c-a9f5eaa3b379/approval?_data=routes/_main.$basePath.$"
        ),
        post_process: fe_approval_post_process_routes,
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/checkout-details",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/ea6579b3-1912-4358-990c-5541b91a110b/checkout-details?_data=routes/_main.$basePath.$"
        ),
        post_process: fe_checkout_details_post_process_routes,
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/checkout-payment",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/ea6579b3-1912-4358-990c-5541b91a110b/checkout-payment?_data=routes/_main.$basePath.$"
        ),
        post_process: fe_checkout_payment_post_process,
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/checkout-signatures",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/ea6579b3-1912-4358-990c-5541b91a110b/checkout-signatures?_data=routes/_main.$basePath.$",
            () => {
                console.log(
                    "FE virtual checkout signatures state in pre process",
                    checkout_signatures_state
                );
                checkout_signatures_state++;
            }
        ),
        post_process: fe_checkout_signatures_post_process,
    },
    {
        method: "GET",
        url: "/agent/virtual/:id/checkout-review",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/virtual/ea6579b3-1912-4358-990c-5541b91a110b/checkout-review?_data=routes/_main.$basePath.$"
        ),
        post_process: fe_checkout_review_post_process,
    },
];

const requests_obj = [
    {
        method: "GET",
        url: "/agent/:token/get-started",
        interception_condition: "root",
        pre_process: explicit_target(() => {
            return application_type === "FINANCIAL_FOUNDATION_IUL_II"
                ? "/agent/d88c2a33-8a5f-4b85-9276-bc1cb9e9d76a/get-started?_data=root"
                : "/agent/1fe1fbfa-1349-4ce9-983f-14afa3e42261/get-started?_data=root";
        }),
    },
    {
        method: "GET",
        url: "/agent/:token/get-started",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(() => {
            console.log("get-started root", application_type);
            return application_type === "FINANCIAL_FOUNDATION_IUL_II"
                ? "/agent/d88c2a33-8a5f-4b85-9276-bc1cb9e9d76a/get-started?_data=routes/_main.$basePath.$"
                : "/agent/1fe1fbfa-1349-4ce9-983f-14afa3e42261/get-started?_data=routes/_main.$basePath.$";
        }),
        post_process: get_started,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition: "/get-started?_data=routes%2F_main.%24basePath.%24",
        handler: handleApplicationRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/consent",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/consent?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/consent",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/consent?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/replacements",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/replacements?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/replacements",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/replacements?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/replacements",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/d516613c-f743-4a52-a51d-8e360386cfe7/replacements?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/:id/replacements",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/d516613c-f743-4a52-a51d-8e360386cfe7/replacements?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "POST",
        register_route: true,
        interception_condition:
            "/replacements?_data=routes%2F_main.%24basePath.%24",
        handler: handleReplacementRequest,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition:
            "/agent/pre-qualification?_data=routes%2F_main.%24basePath.%24",
        handler: handlePreApprovalRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/personal",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/personal?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/personal",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/personal?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition: "/personal?_data=routes%2F_main.%24basePath.%24",
        handler: handlePersonalRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/medical",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/medical?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/medical",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/medical?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition: "/medical?_data=routes%2F_main.%24basePath.%24",
        handler: handleMedicalRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/lifestyle",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/lifestyle?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/lifestyle",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/lifestyle?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition: "/lifestyle?_data=routes%2F_main.%24basePath.%24",
        handler: handleLifestyleRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/document-pin-handoff",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/document-pin-handoff?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/document-pin-handoff",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/document-pin-handoff?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition:
            "/document-pin-handoff?_data=routes%2F_main.%24basePath.%24",
        handler: handlePINRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/sign-with-pin",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/sign-with-pin?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/sign-with-pin",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/sign-with-pin?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        url: "/agent/iul/virtual/:id/sign-with-pin",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/sign-with-pin?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/agent-commission-disclosures",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/agent-commission-disclosures?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/agent-commission-disclosures",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/agent-commission-disclosures?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        url: "/agent/iul/virtual/:id/agent-commission-disclosures",
        interception_condition: filter_interaction_id("commission-complete"),
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/agent-commission-disclosures?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "POST",
        register_route: true,
        interception_condition:
            "/agent-commission-disclosures?_data=routes%2F_main.%24basePath.%24",
        handler: handleCommissionRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/agent-review-documents",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/agent-review-documents?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/agent-review-documents",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/agent-review-documents?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition:
            "/agent-review-documents?_data=routes%2F_main.%24basePath.%24",
        handler: handleReviewDocumentsRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/underwriting",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/underwriting?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/underwriting",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/underwriting?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    // {
    //     method: "POST",
    //     url: "/agent/iul/virtual/:id/underwriting",
    //     interception_condition: filter_underwriting_state(),
    //     pre_process: explicit_target(
    //         "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/underwriting?_data=routes/_main.$basePath.$",
    //         () => {
    //             underwriting_state++
    //         }
    //     ),
    // },
    {
        method: "POST",
        register_route: true,
        interception_condition:
            "/underwriting?_data=routes%2F_main.%24basePath.%24",
        handler: handleUnderwritingRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/approval",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/approval?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/approval",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/d516613c-f743-4a52-a51d-8e360386cfe7/approval?_data=routes/_main.$basePath.$"
        ),
        post_process: approval_post_process,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition: "/approval?_data=routes%2F_main.%24basePath.%24",
        handler: handleIULApprovalRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/overview",
        interception_condition: "root",
        pre_process: overview_pre_process_root(),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/overview",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: overview_pre_process_routes(),
        post_process: overview_post_process,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/checkout-details",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/checkout-details?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/checkout-details",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/checkout-details?_data=routes/_main.$basePath.$"
        ),
        post_process: checkout_details_post_process,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition:
            "/checkout-details?_data=routes%2F_main.%24basePath.%24",
        handler: handleCheckoutDetailsRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/checkout-payment",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/checkout-payment?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/checkout-payment",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/checkout-payment?_data=routes/_main.$basePath.$"
        ),
        post_process: checkout_payment_post_process,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition:
            "/checkout-payment?_data=routes%2F_main.%24basePath.%24",
        handler: handleCheckoutPaymentRequest,
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/checkout-signatures",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/checkout-signatures?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/virtual/:id/checkout-signatures",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/virtual/299c4f89-eda3-4f3e-8e14-121dc42e54dd/checkout-signatures?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        register_route: true,
        interception_condition:
            "/checkout-signatures?_data=routes%2F_main.%24basePath.%24",
        handler: handleCheckoutSignatureRequest,
    },
    // Adding IUL-in person routes 
    {
        method: "GET",
        url: "/agent/iul/:id/consent",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/consent?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/consent",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/consent?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/replacements",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/replacements?_data=root"
        ),
        
    },
    {
        method: "GET",
        url: "/agent/iul/:id/replacements",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/replacements?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/personal",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/personal?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/personal",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/personal?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/medical",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/medical?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/medical",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/medical?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/lifestyle",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/lifestyle?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/lifestyle",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/lifestyle?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/handoff-to-applicant",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/handoff-to-applicant?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/handoff-to-applicant",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/handoff-to-applicant?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/contact",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/contact?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/contact",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/contact?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/handoff-to-agent",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/handoff-to-agent?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/handoff-to-agent",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/handoff-to-agent?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/agent-commission-disclosures",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/agent-commission-disclosures?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/agent-commission-disclosures",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/agent-commission-disclosures?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/agent-review-documents",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/agent-review-documents?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/agent-review-documents",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/agent-review-documents?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "POST",
        url: "/agent/iul/:id/agent-commission-disclosures",
        interception_condition: filter_interaction_id("commission-complete"),
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/agent-commission-disclosures?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/underwriting",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/underwriting?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/underwriting",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/underwriting?_data=routes/_main.$basePath.$"
        ),
        post_process: populate,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/approval",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/approval?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/approval",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/approval?_data=routes/_main.$basePath.$"
        ),
        post_process: approval_post_process,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/review-documents",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/be7bfcea-4fe1-4872-9e33-35405dee90b1/review-documents?_data=routes/_main.$basePath.$"
        ),
        post_process: populate
    },
    {
        method: "GET",
        url: "/agent/iul/:id/checkout-details",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/72414f8f-4909-466d-b6ae-4ca92983afd5/checkout-details?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/checkout-details",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/72414f8f-4909-466d-b6ae-4ca92983afd5/checkout-details?_data=routes/_main.$basePath.$"
        ),
        post_process: checkout_details_post_process,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/checkout-payment",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/72414f8f-4909-466d-b6ae-4ca92983afd5/checkout-payment?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/checkout-payment",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/72414f8f-4909-466d-b6ae-4ca92983afd5/checkout-payment?_data=routes/_main.$basePath.$"
        ),
        post_process: checkout_payment_post_process,
    },
    {
        method: "GET",
        url: "/agent/iul/:id/checkout-signatures",
        interception_condition: "root",
        pre_process: explicit_target(
            "/agent/iul/72414f8f-4909-466d-b6ae-4ca92983afd5/checkout-signatures?_data=root"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/checkout-signatures",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/72414f8f-4909-466d-b6ae-4ca92983afd5/checkout-signatures?_data=routes/_main.$basePath.$"
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/applicant-checkout-review",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: explicit_target(
            "/agent/iul/72414f8f-4909-466d-b6ae-4ca92983afd5/applicant-checkout-review?_data=routes/_main.$basePath.$",
        ),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/overview",
        interception_condition: "root",
        pre_process: overview_pre_process_root(),
    },
    {
        method: "GET",
        url: "/agent/iul/:id/overview",
        interception_condition: "routes/_main.$basePath.$",
        pre_process: overview_pre_process_routes(),
        post_process: overview_post_process,
    },

];

const register_routes = () => {
    [...requests_obj_fe_inperson, ...requests_obj, ...requests_obj_fe].forEach(
        (req) => {
            // Register routes
            if (req.register_route) {
                replay_backend.registerRoute(
                    ({ url }) => {
                        if (typeof req.interception_condition === "function") {
                            return req.interception_condition(url);
                        }
                        const urlPathAndSearch = url.pathname + url.search;
                        let met_condition = urlPathAndSearch.endsWith(
                            req.interception_condition
                        );
                        if (req.application_type) {
                            met_condition =
                                met_condition &&
                                urlPathAndSearch.includes(req.application_type);
                        }
                        return met_condition;
                    },
                    req.handler,
                    req.method
                );
                return;
            }

            // all others
            const has_post_process = Boolean(req.post_process);
            const route = replay_backend[req.method.toLowerCase()](
                req.url,
                (request, body) => {
                    if (!req.interception_condition) return true;
                    if (typeof req.interception_condition === "string") {
                        return (
                            new URL(request.url).searchParams.get("_data") ===
                            req.interception_condition
                        );
                    }
                    if (typeof req.interception_condition === "function") {
                        return req.interception_condition(request, body);
                    }
                }
            ).pre_process(req.pre_process, !has_post_process);
            if (has_post_process) {
                route.post_process(req.post_process);
            }
        }
    );
};

register_routes();

replay_backend.get("/ShippingAPI.dll").block();
replay_backend.match_domain("bam.nr-data.net").block();
////////////////////////////////////////
// CONFIRM PAGE utils
////////////////////////////////////////

function parse_and_populate_additional_data(form_data) {
    additional_data = [
        {
            __typename: "AdditionalApplicationData",
            questionText: "What is the purpose of this insurance?",
            questionId: "additional-info-purpose",
            answerLabel: [
                form_data.purpose_question_text.replaceAll("_", " ").toLowerCase(),
            ],
            value: [form_data.purpose],
        },
        {
            __typename: "AdditionalApplicationData",
            questionText: "Source of Premium",
            questionId: "additional-info-source-of-premium",
            answerLabel: [
                form_data.source_of_premium.replaceAll("_", " ").toLowerCase(),
            ],
            value: [form_data.source_of_premium],
        },
        {
            __typename: "AdditionalApplicationData",
            questionText: "Decline Automatic Transfer Rule",
            questionId: "automatic-transfer-rule",
            answerLabel: [form_data.automatic_transfer_rule],
            value: [form_data.automatic_transfer_rule],
            ...allocation_additional_application_data(form_data),
        },
    ];
}

function allocation_additional_application_data(form_data) {
    // Only include allocation data when the automatic transfer rule is ELECT
    if (!form_data || form_data.automatic_transfer_rule !== "ELECT") {
        return [];
    }
    // Map of allocation keys to their question text
    const allocation_questions = [
        {
            key: "global_index_allocation",
            question_id: "global_index_allocation",
            question_text: "Global Index Account",
        },
        {
            key: "balanced_uncapped_allocation",
            question_id: "balanced_uncapped_allocation",
            question_text: "Balanced Uncapped Index Account",
        },
        {
            key: "sp500_allocation",
            question_id: "sp500_allocation",
            question_text: "S&P 500® Index",
        },
        {
            key: "basic_sp500_allocation",
            question_id: "basic_sp500_allocation",
            question_text: "Basic S&P 500® Index Account (No IAMC)",
        },
        {
            key: "basic_interest_allocation",
            question_id: "basic_interest_allocation",
            question_text: "Basic Interest Account (BIA)",
        },
    ];

    return allocation_questions.map(({ key, question_id, question_text }) => ({
        __typename: "AdditionalApplicationData",
        questionText: question_text,
        questionId: question_id,
        answerLabel: [`${form_data[key]}%`],
        value: [String(form_data[key])],
    }));
}

function parse_and_populate_beneficiaries(formData) {
    const indices = Object.keys(formData)
        .map((k) => {
            const match = k.match(/^beneficiaries\[(\d+)\]\.name\.first$/);
            return match ? parseInt(match[1], 10) : null;
        })
        .filter((v) => v !== null);
    const unique_indices = Array.from(new Set(indices));
    const beneficiaries_data = unique_indices.map((i) => ({
        first_name: formData[`beneficiaries[${i}].name.first`],
        last_name: formData[`beneficiaries[${i}].name.last`],
        percent: formData[`beneficiaries[${i}].percent_allocated`],
    }));

    beneficiaries_data.forEach((b) => {
        if (b.first_name && b.last_name && b.percent) {
            beneficiaries.push(
                make_beneficiary(b.first_name, b.last_name, b.percent)
            );
        }
    });
}

function make_beneficiary(first, last, percent) {
    return {
        __typename: "Beneficiary",
        businessName: null,
        ssnToken: "",
        ssnLastFour: "",
        contacts: null,
        address: {
            __typename: "Address",
            street1: null,
            street2: null,
            city: null,
            state: null,
            postalCode: null,
            country: null,
            type: null,
        },
        dateOfBirth: null,
        email: "",
        isIrrevocable: false,
        name: {
            __typename: "FullName",
            first: first,
            middle: "",
            last: last,
            suffix: "",
        },
        percentAllocated: percent,
        perStirpes: false,
        phone: "",
        relationship: "CHILD",
        type: "PRIMARY",
    };
}

////////////////////////////////////////
// APPLICATION UTILS
////////////////////////////////////////

// may need to update so that last key doesn't have to exist
function safe_set(obj, path, value) {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] == null) return;
        // if (current[keys[i]] == null && i !== keys.length - 1) return;
        current = current[keys[i]];
    }

    if (keys.at(-1) in current) {
        current[keys.at(-1)] = value;
    }
}

const save_answers = (formData) => {
    console.log("formdata: ", formData);
    if (!formData.answers) return;
    const form_answers = JSON.parse(formData.answers);
    form_answers.forEach((answer) => {
        if (!answer_template.hasOwnProperty(answer.key)) return;
        console.log("saving answer", answer);
        const template = answer_template[answer.key];
        template.value = answer.value;
        application_answers[answer.key] = template;
    });
};

const excluded_questions = ["sales_medium"];

const populate_answers = (payload, reset = false) => {
    if (!payload.viewContext.store) return payload;
    const filtered_answers = Object.fromEntries(
        Object.entries(application_answers).filter(
            ([key]) => !excluded_questions.includes(key)
        )
    );
    if (reset) {
        payload.viewContext.store.fromClient.answers = filtered_answers;
        return payload;
    }

    payload.viewContext.store.fromClient.answers = {
        ...payload.viewContext.store.fromClient.answers,
        ...filtered_answers,
    };
    return payload;
};

const populate_enriched_application = (body) => {
    body.viewContext.enrichedApplication?.answers.answers.forEach((ans) => {
        if (ans.key === "primary_email") {
            ans.value = application_answers.primary_email.value;
        } else {
            if (application_answers.hasOwnProperty(ans.key)) {
                ans.value = application_answers[ans.key].value;
            }
        }
    });
    return body;
};

const get_sales_medium = () => {
    return application_answers.sales_medium.value;
};

function shouldDecline() {
    const app = application_answers;
    const getVal = (obj, k) =>
        obj && obj[k] && obj[k].value !== undefined ? obj[k].value : obj?.[k];

    const val = (k) => getVal(app, k);

    const truthyBool = (k) => {
        const v = val(k);
        const result = !!v;
        if (!result) console.log(`[check] ${k}:`, v, "->", result);
        return result;
    };

    const nonEmptyList = (k) => {
        const v = val(k);
        let result = false;
        if (Array.isArray(v)) {
            // Filter out "none", "false", "no", "" (case-insensitive)
            result = v.some((item) => {
                const s = String(item ?? "")
                    .toLowerCase()
                    .trim();
                return s !== "" && s !== "none" && s !== "no" && s !== "false";
            });
        }
        if (!result) console.log(`[check] ${k}:`, v, "->", result);
        return result;
    };

    const gtZero = (k) => {
        const v = val(k);
        let result = false;
        if (typeof v === "number") result = v > 0;
        else if (typeof v === "string") result = Number(v) > 0;
        else if (typeof v === "boolean") result = v === true;
        if (!result) console.log(`[check] ${k}:`, v, "->", result);
        return result;
    };

    const notNone = (k) => {
        const v = String(val(k) ?? "").toLowerCase();
        const result = v !== "" && v !== "none" && v !== "no" && v !== "false";
        if (!result) console.log(`[check] ${k}:`, v, "->", result);
        return result;
    };

    const redFlags = [
        nonEmptyList("cancer_diagnosis"),
        truthyBool("cancer_recurrence"),
        truthyBool("cancer_spread"),
        truthyBool("hiv_aids"),
        truthyBool("tb_list") && notNone("tb_list"),
        truthyBool("transplant_list"),
        truthyBool("wheelchair_oxygen"),
        nonEmptyList("med_conditions"),
        nonEmptyList("med_conditions_five_year"),
        truthyBool("med_conditions_ever_cancer"),
        nonEmptyList("med_knockout"),
        nonEmptyList("life_knockout"),
        truthyBool("drug_abuse_yes_no"),
        truthyBool("substance_abuse"),
        truthyBool("suicide"),
        nonEmptyList("risky_activities"),
        gtZero("hospitalized_times"),
    ];

    const decline = redFlags.some(Boolean);
    console.log("==> Final decision:", decline ? "DECLINE" : "APPROVE");
    return decline;
}

const multiCardQuote = {
    __typename: "IulQuote",
    id: "c8d20397-5a3a-42fd-a885-3e06048edd62",
    ineligibleReason: null,
    isEligible: true,
    productCode: "TAIUL01",
    dateOfBirth: {
        __typename: "DateOnly",
        year: 1984,
        month: 7,
        day: 14,
    },
    riskClassDescriptor: null,
    offer: {
        __typename: "Offer",
        minCents: "1000000",
        maxCents: "50000000",
        ends: {
            __typename: "DateOnly",
            year: 2025,
            month: 11,
            day: 25,
        },
        gender: "Male",
        issueAge: 41,
        products: [
            {
                __typename: "OfferProduct",
                termLength: 0,
                productCode: "TAIUL01",
                riders: [
                    {
                        __typename: "OfferRider",
                        appliedFor: true,
                        audRequired: false,
                        description:
                            "Allows the policy owner to accelerate a portion of the death benefit if the insured becomes chronically ill.",
                        name: "Chronic Illness",
                        optional: false,
                        productCode: "TACHR01",
                        status: "APPROVED",
                        reasons: [
                            {
                                __typename: "EvaluationReason",
                                key: "age",
                                message: "",
                            },
                        ],
                        productType: null,
                        rates: null,
                        childRiderDetails: null,
                    },
                    {
                        __typename: "OfferRider",
                        appliedFor: true,
                        audRequired: false,
                        description:
                            "Allows the policy owner to accelerate a portion of the death benefit if the insured becomes critically ill.",
                        name: "Critical Illness",
                        optional: false,
                        productCode: "TACRIT01",
                        status: "APPROVED",
                        reasons: [
                            {
                                __typename: "EvaluationReason",
                                key: "age",
                                message: "",
                            },
                        ],
                        productType: null,
                        rates: null,
                        childRiderDetails: null,
                    },
                    {
                        __typename: "OfferRider",
                        appliedFor: true,
                        audRequired: false,
                        description:
                            "Prevents a policy from lapsing if outstanding loans exceed the cash surrender value, keeping coverage in force.",
                        name: "Overloan Protection Rider",
                        optional: false,
                        productCode: "TAOP01",
                        status: "APPROVED",
                        reasons: [
                            {
                                __typename: "EvaluationReason",
                                key: "age",
                                message: "",
                            },
                        ],
                        productType: null,
                        rates: null,
                        childRiderDetails: null,
                    },
                    {
                        __typename: "OfferRider",
                        appliedFor: true,
                        audRequired: false,
                        description:
                            "Access a portion of the policy's death benefit if the insured is diagnosed with a terminal illness with a limited life expectancy.",
                        name: "Terminal Illness",
                        optional: false,
                        productCode: "TATI01",
                        status: "APPROVED",
                        reasons: [
                            {
                                __typename: "EvaluationReason",
                                key: "age",
                                message: "",
                            },
                        ],
                        productType: null,
                        rates: null,
                        childRiderDetails: null,
                    },
                ],
            },
        ],
        starts: {
            __typename: "DateOnly",
            year: 2025,
            month: 9,
            day: 26,
        },
    },
    minFaceAmountDollars: "10000",
    maxFaceAmountDollars: "500000",
    state: "AK",
};

const answer_template = {
    sales_medium: {
        value: "in_person",
        type: "string",
        key: "sales_medium",
        dirty: true,
    },
    gender: {
        key: "gender",
        value: "male",
        type: "string",
        dirty: false,
    },
    birth_date: {
        key: "birth_date",
        value: "1984-07-14T00:00:00.000Z",
        type: "date",
        dirty: false,
    },
    unchangeable_state: {
        key: "unchangeable_state",
        value: "AK",
        type: "set_once_string",
        dirty: false,
    },
    agent_phone: {
        key: "agent_phone",
        value: "123-123-1234",
        type: "string",
        dirty: false,
    },
    agent_email: {
        key: "agent_email",
        value: "TAAGENT+XYZ003@BESTOW.COM",
        type: "string",
        dirty: false,
    },
    first_name: {
        key: "first_name",
        value: "JON",
        type: "string",
        dirty: false,
    },
    middle_name: {
        key: "middle_name",
        value: "",
        type: "string",
        dirty: false,
    },
    last_name: {
        key: "last_name",
        value: "DOE",
        type: "string",
        dirty: false,
    },
    height: {
        key: "height",
        value: 72,
        type: "number",
        dirty: false,
    },
    weight: {
        key: "weight",
        value: 180,
        type: "number",
        dirty: false,
    },
    primary_email: {
        key: "primary_email",
        value: "EREZ.SEGALL@REPRISE.COM",
        type: "string",
        dirty: false,
    },
    current_ins: {
        key: "current_ins",
        value: "no",
        type: "string",
        dirty: false,
    },
    current_ins_not_owned: {
        key: "current_ins_not_owned",
        value: false,
        type: "boolean",
        dirty: false,
    },
    current_ins_agent: {
        key: "current_ins_agent",
        value: false,
        type: "boolean",
        dirty: false,
    },
    phone: {
        key: "phone",
        value: "123-123-1232",
        type: "string",
        dirty: false,
    },
    no_mobile: {
        key: "no_mobile",
        value: false,
        type: "boolean",
        dirty: false,
    },
    stateless_address: {
        key: "stateless_address",
        value: {
            street_1: "3215 MONTCLAIRE CT",
            street_2: "",
            city: "ANCHORAGE",
            state: null,
            country: "US",
            postal_code: "99503",
        },
        type: "stateless_address",
        dirty: false,
    },
    mailing_address_different: {
        key: "mailing_address_different",
        value: false,
        type: "boolean",
        dirty: false,
    },
    mailing_address: {
        key: "mailing_address",
        value: {
            STREET_1: "3215 MONTCLAIRE CT",
            STREET_2: "",
            CITY: "ANCHORAGE",
            STATE: "AK",
            POSTAL_CODE: "99503",
        },
        type: "mailing_address",
        dirty: false,
    },
    citizen: {
        key: "citizen",
        value: "yes",
        type: "string",
        dirty: false,
    },
    birth_country: {
        key: "birth_country",
        value: "US",
        type: "string",
        dirty: false,
    },
    birth_state: {
        key: "birth_state",
        value: "AL",
        type: "string",
        dirty: false,
    },
    ssn: {
        key: "ssn",
        value: "***-**-3123",
        type: "sensitive_string",
        dirty: false,
    },
    valid_drivers_license: {
        key: "valid_drivers_license",
        value: "no",
        type: "string",
        dirty: false,
    },
    med_knockout: {
        key: "med_knockout",
        value: ["none"],
        type: "list",
        dirty: false,
    },
    life_knockout: {
        key: "life_knockout",
        value: ["none"],
        type: "list",
        dirty: false,
    },
    transplant_list: {
        key: "transplant_list",
        value: false,
        type: "boolean",
        dirty: false,
    },
    suicide: {
        key: "suicide",
        value: false,
        type: "boolean",
        dirty: false,
    },
    med_conditions_ever: {
        key: "med_conditions_ever",
        value: ["cancer"],
        type: "list",
        dirty: false,
    },
    cancer_diagnosis: {
        key: "cancer_diagnosis",
        value: ["breast"],
        type: "list",
        dirty: false,
    },
    cancer_spread: {
        key: "cancer_spread",
        value: false,
        type: "boolean",
        dirty: false,
    },
    cancer_recurrence: {
        key: "cancer_recurrence",
        value: false,
        type: "boolean",
        dirty: false,
    },
    med_conditions_ever_cancer: {
        key: "med_conditions_ever_cancer",
        value: false,
        type: "boolean",
        dirty: false,
    },
    med_conditions_five_year: {
        key: "med_conditions_five_year",
        value: ["none"],
        type: "list",
        dirty: false,
    },
    med_conditions: {
        key: "med_conditions",
        value: ["none"],
        type: "list",
        dirty: false,
    },
    wheelchair_oxygen: {
        key: "wheelchair_oxygen",
        value: false,
        type: "boolean",
        dirty: false,
    },
    hospitalized_times: {
        key: "hospitalized_times",
        value: false,
        type: "boolean",
        dirty: false,
    },
    pending_medical: {
        key: "pending_medical",
        value: false,
        type: "boolean",
        dirty: false,
    },
    lbr_knockout: {
        key: "lbr_knockout",
        value: ["none"],
        type: "list",
        dirty: false,
    },
    mobility: {
        key: "mobility",
        value: ["none"],
        type: "list",
        dirty: false,
    },
    hiv_aids: {
        key: "hiv_aids",
        value: false,
        type: "boolean",
        dirty: false,
    },
    tb_blic: {
        key: "tb_blic",
        value: "none",
        type: "string",
        dirty: false,
    },
    expected_travel_yes_no: {
        key: "expected_travel_yes_no",
        value: false,
        type: "boolean",
        dirty: false,
    },
    residing_outside_us: {
        key: "residing_outside_us",
        value: false,
        type: "boolean",
        dirty: false,
    },
    employment_type_restricted: {
        key: "employment_type_restricted",
        value: false,
        type: "boolean",
        dirty: false,
    },
    active_military: {
        key: "active_military",
        value: false,
        type: "boolean",
        dirty: false,
    },
    occupation: {
        key: "occupation",
        value: "engineering",
        type: "string",
        dirty: false,
    },
    occupation_description: {
        key: "occupation_description",
        value: "ENGINEER",
        type: "string",
        dirty: false,
    },
    annual_income: {
        key: "annual_income",
        value: 123123,
        type: "number",
        dirty: false,
    },
    household_income: {
        key: "household_income",
        value: 1000000,
        type: "number",
        dirty: false,
    },
    bankruptcy: {
        key: "bankruptcy",
        value: false,
        type: "boolean",
        dirty: false,
    },
    risky_activities: {
        key: "risky_activities",
        value: ["none"],
        type: "list",
        dirty: false,
    },
    felony_charges: {
        key: "felony_charges",
        value: false,
        type: "boolean",
        dirty: false,
    },
    drug_abuse_yes_no: {
        key: "drug_abuse_yes_no",
        value: false,
        type: "boolean",
        dirty: false,
    },
    substance_abuse: {
        key: "substance_abuse",
        value: false,
        type: "boolean",
        dirty: false,
    },
    driving_conviction: {
        key: "driving_conviction",
        value: false,
        type: "boolean",
        dirty: false,
    },
    owner: {
        key: "owner",
        value: true,
        type: "boolean",
        dirty: false,
    },
    "stateless_address.STREET_1": {
        value: "1600 Pennsylvania Avenue",
    },
    "stateless_address.POSTAL_CODE": {
        value: "10001",
    },
    "stateless_address.CITY": {
        value: "Washington",
    },
    "stateless_address.STATE": {
        value: "TX",
    },
    intendedCoverage: 1000000,
};

////////////////////////////////////////
// PIN CODE EMAIL
////////////////////////////////////////

replay_backend.get("/pin_code").handle(async (request) => {
    return new Blob([pin_email], { type: "text/html" });
});

const pin_email = `
<div><div class=aHl></div><div id=:17n tabindex=-1></div><div class="gt ii"id=:18i jslog="20277; u014N:xr6bB; 1:WyIjdGhyZWFkLWY6MTg0NDQzMzc2OTEyODQzMDkzMCJd; 4:WyIjbXNnLWY6MTg0NDQzMzc2OTEyODQzMDkzMCIsbnVsbCxudWxsLG51bGwsMSwwLFsxLDAsMF0sMTA3LDcyNixudWxsLG51bGwsbnVsbCxudWxsLG51bGwsMSxudWxsLG51bGwsWzNdLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLDAsMF0."><div class="a3s aiL msg-6591581507656822621"id=:18j><u></u><div style="margin:0 auto;padding:0;background-color:#fafafa"><table style=background-color:#fafafa;width:100%;padding:0;margin:0;color:#222><tr><td align=center><table style="max-width:600px;margin:0 auto"><tr><td style=background-color:#fafafa;padding:0;margin:0><table style=border-collapse:collapse;width:100%;border-spacing:0><tr><td style="padding:24px 32px 8px 32px"class=m_-6591581507656822621mobile-less-padding><table style=border-collapse:collapse;width:100%;border-spacing:0><tr><td style=font-size:16px;color:#282624;padding:24px;line-height:22px;background-color:#fff;border-radius:8px><table><tr><td><p style=margin-bottom:32px>Hi,<p style=margin-bottom:32px>Once you've reviewed your application, authorizations, and disclosures, now you are ready to electronically sign, by providing your agent with your PIN code.<p style=margin-bottom:32px>If anything in the application needs to be updated, tell your agent, and they can make any necessary changes.<p style=margin-bottom:32px>If you're the payor of this policy, by signing your documents you agree to the terms outlined at <a data-saferedirecturl="https://www.google.com/url?q=http://url620.uat.mylifeinsurance.transamerica.com/ls/click?upn%3Du001.ufDMafaIl939jyWzYdBOPWjk506zWjGX9EvqE6bSHyzFdPvQvet095VMy85vcHyYolEcc8O5w3m-2BTI13UEubHeZaJmN4Iltq00Sy0LVX1UH5Q-2FTz8vp5MwZORE-2BRenM7UM1e_0-2F4uCFdIadfbLNnkzoqmUVT3TucQVGASPIY-2Bno0gxBKSu5BaSgWdehzAHBnQWgbOahjqEUpWZQSlg9U2EgWusYToVyheWK3Ag6HNCFY5WHCAQ0K2iEs1aYzbXvjZrFf1ndEnKZEKuMzar-2BP0LpX2tah8ScD15jMGDnP1Fjuc-2Bb0sX8aO20D5V7NX9UwNhsyE84A373WhG0-2Bp6UbVxpSa-2Br8k823jF-2Bwt003WP32oLFkvkp0EGTX6macQz3CEmZs03Thim9rOqtLFZSY-2Bg70XyAMCpRlotrZyLQ26MnM3XuHFLkitKO1ipujK18Y46QFxkC5PL0Ekt4a7BJbePKmFQWYAvx0MhnFgZSlH8rxgtp4pJZFEqTyOhF5DJXSKlbBPrKq35GMIg-2Fep8cWrrHlRIrmEcpqmDSXgLv1xbAM36Nu3z7ET9m4s4CEBKjAoZbE8&source=gmail&ust=1759090903754000&usg=AOvVaw0x7e4zlQ8iQ9ebYlsTzXjp"href="http://url620.uat.mylifeinsurance.transamerica.com/ls/click?upn=u001.ufDMafaIl939jyWzYdBOPWjk506zWjGX9EvqE6bSHyzFdPvQvet095VMy85vcHyYolEcc8O5w3m-2BTI13UEubHeZaJmN4Iltq00Sy0LVX1UH5Q-2FTz8vp5MwZORE-2BRenM7UM1e_0-2F4uCFdIadfbLNnkzoqmUVT3TucQVGASPIY-2Bno0gxBKSu5BaSgWdehzAHBnQWgbOahjqEUpWZQSlg9U2EgWusYToVyheWK3Ag6HNCFY5WHCAQ0K2iEs1aYzbXvjZrFf1ndEnKZEKuMzar-2BP0LpX2tah8ScD15jMGDnP1Fjuc-2Bb0sX8aO20D5V7NX9UwNhsyE84A373WhG0-2Bp6UbVxpSa-2Br8k823jF-2Bwt003WP32oLFkvkp0EGTX6macQz3CEmZs03Thim9rOqtLFZSY-2Bg70XyAMCpRlotrZyLQ26MnM3XuHFLkitKO1ipujK18Y46QFxkC5PL0Ekt4a7BJbePKmFQWYAvx0MhnFgZSlH8rxgtp4pJZFEqTyOhF5DJXSKlbBPrKq35GMIg-2Fep8cWrrHlRIrmEcpqmDSXgLv1xbAM36Nu3z7ET9m4s4CEBKjAoZbE8"rel="noopener noreferrer"target=_blank>https://qa.mylifeinsurance.<wbr>transamerica.com/applicant/<wbr>verification-consent</a><p style=color:#a61b4a;margin-bottom:32px>Providing this code is your electronic signature and has the same legal validity and effect as your handwritten signature.<tr><td><div style=padding:16px;box-sizing:content-box;border-radius:8px;background-color:#f3f3f3><p style=font-weight:900;font-size:12px;margin-top:0;margin-bottom:8px;line-height:16.8px;text-align:center;letter-spacing:1.44px>PIN CODE<p style=font-weight:900;font-size:32px;margin-top:8px;margin-bottom:0;line-height:38.4px;text-align:center>${Math.floor(
    100000 + Math.random() * 900000
)}</div><tr><td style="padding:12px 0 0 0"><p>"Signed by electronic signature" will appear on forms as your signature.</table></table></table><table style=border-collapse:collapse;width:100%;border-spacing:0><tr><td style="padding:0 32px"class=m_-6591581507656822621mobile-less-padding><table style=border-collapse:collapse;width:100%;border-spacing:0><tr><td style=padding-top:24px><div style=border-radius:4px;background-image:linear-gradient(#fafafa,#fafafa);display:grid><a data-saferedirecturl="https://www.google.com/url?q=http://url620.uat.mylifeinsurance.transamerica.com/ls/click?upn%3Du001.ufDMafaIl939jyWzYdBOPRGZ94Q6BD0LARZJ0gBsnElJlk7YkbXvf-2F-2FDF9uTpSfrt_oR_0-2F4uCFdIadfbLNnkzoqmUVT3TucQVGASPIY-2Bno0gxBKSu5BaSgWdehzAHBnQWgbOahjqEUpWZQSlg9U2EgWusYToVyheWK3Ag6HNCFY5WHCAQ0K2iEs1aYzbXvjZrFf1ndEnKZEKuMzar-2BP0LpX2tah8ScD15jMGDnP1Fjuc-2Bb0sX8aO20D5V7NX9UwNhsyE84A373WhG0-2Bp6UbVxpSa-2Br8k823jF-2Bwt003WP32oLFkvkp0EGTX6macQz3CEmZs03Thim9rOqtLFZSY-2Bg70XyAMCpRlotrZyLQ26MnM3XuF5Dlr791F3d7yRSgbSarnIW5aUGbzrgfE9XbqXHeDMjQoIuwcralzRBPhDdMdPOcDFUlR1ecVILYPT7c3QsMq5wY93BL37IA7snPYJfYGlZT-2Fc-2ByxtpgczUXRZgVQ8b3D0C2-2FuWyHDPXwXfz6xtwo5&source=gmail&ust=1759090903754000&usg=AOvVaw1cMG7TPqjH09ae5AHs0iix"href="http://url620.uat.mylifeinsurance.transamerica.com/ls/click?upn=u001.ufDMafaIl939jyWzYdBOPRGZ94Q6BD0LARZJ0gBsnElJlk7YkbXvf-2F-2FDF9uTpSfrt_oR_0-2F4uCFdIadfbLNnkzoqmUVT3TucQVGASPIY-2Bno0gxBKSu5BaSgWdehzAHBnQWgbOahjqEUpWZQSlg9U2EgWusYToVyheWK3Ag6HNCFY5WHCAQ0K2iEs1aYzbXvjZrFf1ndEnKZEKuMzar-2BP0LpX2tah8ScD15jMGDnP1Fjuc-2Bb0sX8aO20D5V7NX9UwNhsyE84A373WhG0-2Bp6UbVxpSa-2Br8k823jF-2Bwt003WP32oLFkvkp0EGTX6macQz3CEmZs03Thim9rOqtLFZSY-2Bg70XyAMCpRlotrZyLQ26MnM3XuF5Dlr791F3d7yRSgbSarnIW5aUGbzrgfE9XbqXHeDMjQoIuwcralzRBPhDdMdPOcDFUlR1ecVILYPT7c3QsMq5wY93BL37IA7snPYJfYGlZT-2Fc-2ByxtpgczUXRZgVQ8b3D0C2-2FuWyHDPXwXfz6xtwo5"rel="noopener noreferrer"target=_blank></a></div></table><table style=border-collapse:collapse;width:100%;border-spacing:0><tr><td style="padding-top:16px;font-family:'Whitney Book',sans-serif;padding:0;font-style:normal;font-weight:300;font-size:12px;line-height:140%;text-align:center;color:#6e6b68;text-align:left"class=m_-6591581507656822621mobile-less-padding><p style=font-weight:400;font-size:14px;line-height:21px>© 2025 Transamerica Life Insurance Company. All Rights Reserved.</table><tr><td style="padding:24px;font-family:'Whitney Book',sans-serif"></table></table></table></div><div class=yj6qo></div><div class=adL></div></div></div><div class=WhmR8e data-hash=0></div></div>
`;


////////////////////////////////////////
// PDF
////////////////////////////////////////

// replay_backend.get("/storage.googleapis.com/ryerson-qa-dss-storage/:token").pre_process(async (request) => {
// 	const url = new URL(request.url, location.href);
// 	return new Request(url.toString(), {
// 		...request,
// 		headers: {
// 			...request.headers,
// 			"Partial-Target": "/storage.googleapis.com/ryerson-qa-dss-storage",
// 		},
// 		method: request.method,
// 	});
// })