// used for the last /checkout-review call to prevent the pricing call from resetting the values
let passed_review = false;

replay_backend
    .post("/composer/api/v1/policy/ea6579b3-1912-4358-990c-5541b91a110b/pricing")
    .post_process(async (response) => {
        let body = await response.json();
        console.log("body pricing", body, body.rates[0].prices[0].face_amount.cents)
        if (body.rates[0].prices[0].face_amount.cents) {
            body.rates[0].prices[0].face_amount.cents = application_answers?.intendedCoverage?.replace(/,/g, "") * 100
        }
        return new Blob([JSON.stringify(body)], { type: "application/json" });
    })

function calculate_for_monthly_amount(cents) {
    // Constants from the insurance product data
    const MONTHLY_MODAL_FACTOR = 0.086;
    const POLICY_FEE_CENTS = 4200;  // $42.00
    const POLICY_RATE_CENTS = 3198; // $31.98 per $1,000 of coverage

    // Step 1: Calculate yearly premium from monthly
    const yearly_premium_cents = Math.round(cents / MONTHLY_MODAL_FACTOR);

    // Step 2: Calculate face amount
    // Formula: Face Amount = ((Yearly Premium - Policy Fee) × 100,000) ÷ Policy Rate
    const face_amount_cents = Math.round(
        ((yearly_premium_cents - POLICY_FEE_CENTS) * 100000) / POLICY_RATE_CENTS
    );

    return {
        face_amount_cents,
        yearly_premium_cents
    };
}

function calculate_for_face_amount(cents) {
    // Constants from the insurance product data
    const POLICY_RATE_CENTS = 3198;    // $31.98 per $1,000 of coverage
    const POLICY_FEE_CENTS = 4200;     // $42.00
    const MONTHLY_MODAL_FACTOR = 0.086;

    // Step 1: Calculate base premium
    // Formula: (Face Amount ÷ 100,000) × Policy Rate
    const base_premium_cents = Math.round((cents / 100000) * POLICY_RATE_CENTS);

    // Step 2: Calculate yearly premium by adding policy fee
    const yearly_premium_cents = base_premium_cents + POLICY_FEE_CENTS;

    // Step 3: Calculate monthly premium using modal factor
    const monthly_premium_cents = Math.round(yearly_premium_cents * MONTHLY_MODAL_FACTOR);

    return {
        monthly_premium_cents,
        yearly_premium_cents
    };
}

let is_monthly_premium = false;
let monthly_premium_query_param = null;
let face_amount_query_param = null;

replay_backend.get("/composer/api/v1/policy/:uuid/pricing", (request) => {
    is_monthly_premium = new URL(request.url).searchParams.get("monthly_premium") !== null;
    if (is_monthly_premium) {
        monthly_premium_query_param = new URL(request.url).searchParams.get("monthly_premium");
    } else {
        face_amount_query_param = new URL(request.url).searchParams.get("face_amount");
    }

    // reset flags
    if (!passed_review) {
        final_monthly_premium = null;
        final_yearly_premium = null;
        final_face_amount = null;
    }

    return !passed_review;
}).post_process(async (resp) => {
    let json = await resp.json();
    console.log("json: ", json);
    console.log("is_monthly_premium", is_monthly_premium);
    if (is_monthly_premium) {
        const { face_amount_cents, yearly_premium_cents } = calculate_for_monthly_amount(monthly_premium_query_param);
        console.log("face_amount_cents: ", face_amount_cents);
        console.log("yearly_premium_cents", yearly_premium_cents);
        json.rates[0].prices[0].face_amount.cents = face_amount_cents;
        json.rates[0].prices[0].premium_monthly.cents = monthly_premium_query_param;
        json.rates[0].prices[0].premium_yearly.cents = yearly_premium_cents;
        json.rates[0].prices[0].total_monthly_premium.cents = monthly_premium_query_param;
        json.rates[0].prices[0].total_yearly_premium.cents = yearly_premium_cents;
    } else {
        const { monthly_premium_cents, yearly_premium_cents } = calculate_for_face_amount(face_amount_query_param);
        console.log("monthly_premium_cents: ", monthly_premium_cents);
        console.log("yearly_premium_cents", yearly_premium_cents);
        json.rates[0].prices[0].face_amount.cents = face_amount_query_param;
        json.rates[0].prices[0].premium_monthly.cents = monthly_premium_cents;
        json.rates[0].prices[0].premium_yearly.cents = yearly_premium_cents;
        json.rates[0].prices[0].total_monthly_premium.cents = monthly_premium_cents;
        json.rates[0].prices[0].total_yearly_premium.cents = yearly_premium_cents;
    }

    // ALWAYS set values - we want the CALCULATED values, not form data
    console.log("✅ SAVING CALCULATED PREMIUM VALUES");
    final_monthly_premium = json.rates[0].prices[0].premium_monthly.cents;
    final_yearly_premium = json.rates[0].prices[0].premium_yearly.cents;
    final_face_amount = json.rates[0].prices[0].face_amount.cents;
    console.log("  final_monthly_premium:", final_monthly_premium);
    console.log("  final_yearly_premium:", final_yearly_premium);
    console.log("  final_face_amount:", final_face_amount);

    // reset flags
    is_monthly_premium = false;
    monthly_premium_query_param = null;
    face_amount_query_param = null;

    return new Blob([JSON.stringify(json)], { type: "application/json" });
});