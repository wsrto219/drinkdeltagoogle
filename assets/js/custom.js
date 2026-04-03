$(function () {

    // Inject styles for flavor selector
    $('head').append(`<style>
        .mc-flavor-wrap {
            display: flex !important;
            gap: 10px !important;
            flex-wrap: wrap !important;
            margin-top: 8px !important;
            margin-bottom: 16px !important;
            align-items: flex-end !important;
        }
        /* All flavor pills (Variety + individual flavors) */
        .mc-flavor-pill.mc-variety-pill,
        .mc-flavor-pill.mc-local-flavor {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            cursor: pointer !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            gap: 6px !important;
            width: 88px !important;
        }
        .mc-flavor-pill .mc-flavor-img-wrap {
            width: 80px !important;
            height: 80px !important;
            border-radius: 14px !important;
            overflow: hidden !important;
            border: 3px solid transparent !important;
            transition: border-color 0.2s ease !important;
        }
        .mc-flavor-pill .mc-flavor-img-wrap img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            object-position: center top !important;
            display: block !important;
        }
        .mc-flavor-pill:hover .mc-flavor-img-wrap {
            border-color: #2D2B5E !important;
        }
        .mc-flavor-pill.active .mc-flavor-img-wrap {
            border-color: #2D2B5E !important;
        }
        .mc-flavor-pill .mc-flavor-label {
            font-family: "Manrope", sans-serif !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            color: #333 !important;
            text-align: center !important;
            line-height: 1.2 !important;
            text-transform: none !important;
            white-space: normal !important;
            display: block !important;
        }
        .mc-flavor-pill input { display: none !important; }
        .mc-flavor-heading {
            font-family: "ECKHARDT", sans-serif !important;
            font-weight: 500 !important;
            font-size: 16px !important;
            color: rgb(45, 43, 94) !important;
            margin-bottom: 6px !important;
            margin-top: 12px !important;
            text-transform: uppercase !important;
        }
        /* Quantity pills font */
        .quantity-pill, .pill {
            font-family: "ECKHARDT", sans-serif !important;
            text-transform: uppercase !important;
        }
        /* Hide old flavor variation */
        .product-flavour-variation { display: none !important; }

        /* Subscription card styles */
        .option-card {
            cursor: pointer !important;
            font-family: "Manrope", sans-serif !important;
            transition: all 0.2s ease !important;
        }
        .option-card * {
            font-family: "Manrope", sans-serif !important;
        }
        .option-card.active {
            background: #EDF5FF !important;
            border-color: #EDF5FF !important;
            color: #2D2B5E !important;
        }
        .option-card.active .fw-semibold,
        .option-card.active .price,
        .option-card.active .payable_amount,
        .option-card.active .strike,
        .option-card.active .sub-save-label,
        .option-card.active li {
            color: #2D2B5E !important;
        }
        .option-card.active .strike {
            opacity: 0.7 !important;
        }
        .option-card.active .form-select {
            background-color: #fff !important;
            color: #333 !important;
        }
        .option-card:not(.active) {
            background: #fff !important;
            border: 1px solid #d0d0d0 !important;
        }

        /* Global ECKHARDT */
        .product-wrap, .product-wrap * {
            font-family: "ECKHARDT", sans-serif;
        }
        .selling_plans .small {
            list-style: disc !important;
            padding-left: 20px !important;
        }
        .selling_plans .small li {
            list-style: disc !important;
            display: list-item !important;
        }
    </style>`);

    const API_URL = "https://bfac5a-e3.myshopify.com/products.json";
    const CART_STORAGE_KEY = "drink_delta_cart";
    let ALL_PRODUCTS = [];
    let CURRENT_PRODUCT = null;
    let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    updateImage();

    function formatPrice(value) {
        return Number(value).toFixed(2);
    }

    function getCurrentVariantPrice() {
        const currentVariantPrice = parseFloat($('.variant input:checked').attr('variant_price'));
        return Number.isNaN(currentVariantPrice) ? 0 : currentVariantPrice;
    }

    function getSubscriptionPrice(variantPrice, selectedPlanId) {
        const productId = Number($('.add-to-cart').attr('product_id'));
        const variationId = String($('.add-to-cart').attr('variation'));
        const product = ALL_PRODUCTS.find((item) => Number(item.id) === productId);
        const variant = product?.variants?.find((item) => String(item.id) === variationId);

        const matchedAllocation = variant?.selling_plan_allocations?.find((allocation) =>
            String(allocation.selling_plan_id) === String(selectedPlanId)
        );

        if (matchedAllocation && typeof matchedAllocation.price === 'number') {
            return matchedAllocation.price / 100;
        }

        // Fallback: determine discount by selected frequency
        const selectedText = $('.selling_plans .option-card.subscription select option:selected').text().toLowerCase();
        if (selectedText.includes('month')) {
            return variantPrice * 0.85; // 15% off for monthly
        }
        return variantPrice * 0.80; // 20% off for every 2 weeks
    }

    function isSamplerPack(product) {
        return product && Number(product.id) === 9291389534452;
    }

    function toggleSubscriptionUI(product) {
        const BUNDLE_IDS = [8371013451949, 8449097007277, 8449097433261];
        const isBundle = product && BUNDLE_IDS.includes(Number(product.id));
        const isVarietyActive = $('.mc-variety-pill').hasClass('active');

        if (isBundle && isVarietyActive) {
            // Hide subscription for bundle/Variety view — one-time only
            $('.selling_plans .option-card.subscription').hide();
            $('.selling_plans .subscribe-banner').hide();
            $('.hover-wrapper').hide();
            // Auto-select one-time purchase
            $('input[name="purchaseOption"][value="one-time"]').prop('checked', true).trigger('change');
            $('.one_time_purchase').addClass('active');
            $('.subscribe-per-can').text('');
        } else {
            $('.selling_plans .option-card.subscription').show();
            $('.selling_plans .subscribe-banner').show();
            $('.hover-wrapper').show();
        }
    }

    function syncPlanPrices() {
        const variantPrice = getCurrentVariantPrice();
        const selectedPlanId = $('.selling_plans .option-card.subscription select').val();
        const subscriptionPrice = getSubscriptionPrice(variantPrice, selectedPlanId);

        const SELLING_PLAN_IDS = {
            'every_month':    '1892745389',
            'every_4_weeks':  '1892745389',
            'every_6_weeks':  '2698707117',
            'every_8_weeks':  '3462889645',
            'every_10_weeks': '3462922413',
            'every_week':     '2698510509',
            'every_2_weeks':  '2698674349'
        };

        const selectedText = $('.selling_plans .option-card.subscription select option:selected').text().toLowerCase();
        let resolvedPlanId = selectedPlanId;
        if (selectedText.includes('month'))        resolvedPlanId = SELLING_PLAN_IDS['every_month'];
        else if (selectedText.includes('10 week')) resolvedPlanId = SELLING_PLAN_IDS['every_10_weeks'];
        else if (selectedText.includes('8 week'))  resolvedPlanId = SELLING_PLAN_IDS['every_8_weeks'];
        else if (selectedText.includes('6 week'))  resolvedPlanId = SELLING_PLAN_IDS['every_6_weeks'];
        else if (selectedText.includes('4 week'))  resolvedPlanId = SELLING_PLAN_IDS['every_4_weeks'];
        else if (selectedText.includes('2 week'))  resolvedPlanId = SELLING_PLAN_IDS['every_2_weeks'];
        else if (selectedText.includes('week'))    resolvedPlanId = SELLING_PLAN_IDS['every_week'];

        $('.selling_plans .option-card.subscription .sub-save-label').html('Subscribe &amp; Save <span style="background:#C42F03; color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; margin-left:6px; vertical-align:middle;">20%</span>');

        $('.one_time_purchase input[name="purchaseOption"]').attr('plan_price', formatPrice(variantPrice));
        $('#one_time_purchase .payable_amount').text(`$${formatPrice(variantPrice)}`);

        $('.selling_plans .option-card.subscription input[name="purchaseOption"]')
            .attr('selling_plan', resolvedPlanId)
            .attr('plan_price', formatPrice(subscriptionPrice));
        $('.selling_plans .option-card.subscription .payable_amount').text(formatPrice(subscriptionPrice));
        $('.selling_plans .option-card.subscription .strike').text(`$${formatPrice(variantPrice)}`);
    }

    function applySelectedProduct(targetProduct) {
        if (!targetProduct) return;
        CURRENT_PRODUCT = targetProduct;

        const productImages = Array.isArray(targetProduct.images) ? targetProduct.images : [];
        const productVariants = Array.isArray(targetProduct.variants) ? targetProduct.variants : [];
        const sortedVariants = [...productVariants].sort((a, b) => {
            const aQty = parseInt(String(a?.title || '').match(/\d+/)?.[0] || '999999', 10);
            const bQty = parseInt(String(b?.title || '').match(/\d+/)?.[0] || '999999', 10);
            return aQty - bQty;
        });

        // Set title — use strength selector label if active, otherwise product title
        const $activeStrength = $('.strength-pill.active');
        if ($activeStrength.length) {
            const strengthKey = $activeStrength.data('strength');
            const STRENGTH_MAP = { light: '5 Sampler Pack', moderate: '10 Sampler Pack', experience: '20 Sampler Pack' };
            $('.product_title').text(STRENGTH_MAP[strengthKey] || targetProduct.title);
        } else {
            $('.product_title').text(targetProduct.title);
            if (targetProduct.title == "THE VARIETY PACK") {
                $('.product_title').text("The Sampler Pack");
            }
        }

        // Determine if this is a bundle (strength) product vs individual flavor
        const BUNDLE_IDS = [8371013451949, 8449097007277, 8449097433261];
        const isBundle = BUNDLE_IDS.includes(Number(targetProduct.id));

        // Product descriptions
        const PRODUCT_DESCRIPTIONS = {
            8371013451949: 'Canna-curious? Need a light lift on a night out? Keeping it casual? The 5\'s are a good start. Our variety pack includes a 4-pack of each 5\'s flavor: Bright Berry, Tropical Mango, Juicy Watermelon, and Squeeze of Lime, so you can enjoy the full lineup and find your favorite.',
            8449097007277: 'This bundle includes a 4-pack of every 10\'s flavor: Blood Orange, Passion Fruit, Pink Lemonade, and Blueberry Acai, each formulated to help wind down without feeling weighed down. Enjoy the full lineup and find your favorite.',
            8449097433261: 'Start sipping on expert mode. The 20\'s variety pack includes a 4-pack of each flavor: Blood Orange, Passion Fruit, Pink Lemonade, and Blueberry Acai, for a deep, full-bodied relaxation in every flavor. Enjoy the full lineup and find your favorite.'
        };
        const productDesc = PRODUCT_DESCRIPTIONS[Number(targetProduct.id)] || '';
        $('.product-description').text(productDesc);

        $('.product-wrap .container').first().attr('product_id', targetProduct.id);

        // Thumbnails
        let imageHtml = '';
        productImages.forEach((item, index) => {
            imageHtml += `<button class="thumb-btn ${index === 0 ? 'active' : ''}" data-index="${index}" data-src="${item.src}">
              <div class="thumb">
                <img src="${item.src}" alt="Product thumbnail ${index + 1}">
              </div>
            </button>`;
        });
        $('.thumb-col').html(imageHtml);

        // Use local bundle images per strength, otherwise use Shopify images
        const BUNDLE_IMG_MAP = {
            8371013451949: { base: 'assets/images/5mg', count: 6 },
            8449097007277: { base: 'assets/images/10mg', count: 6 },
            8449097433261: { base: 'assets/images/20mg', count: 6 }
        };
        const bundleImgConfig = isBundle && BUNDLE_IMG_MAP[Number(targetProduct.id)];
        if (bundleImgConfig) {
            $('#mainImage').attr('src', `${bundleImgConfig.base}/1.jpg`);

            let thumbHtml = '';
            for (let i = 1; i <= bundleImgConfig.count; i++) {
                const src = `${bundleImgConfig.base}/${i}.jpg`;
                thumbHtml += `<button class="thumb-btn${i === 1 ? ' active' : ''}" data-index="${i - 1}" data-src="${src}">
                    <div class="thumb"><img src="${src}" alt="Product thumbnail ${i}"></div>
                </button>`;
            }
            $('.thumb-col').html(thumbHtml);
        } else if (productImages[0]?.src) {
            $('#mainImage').attr('src', productImages[0].src);
        }

        // Bundle price overrides and per-can rates
        const BUNDLE_PRICES = {
            8371013451949: { price: '69.96', perCan: '4.37' },
            8449097007277: { price: '75.96', perCan: '4.75' },
            8449097433261: { price: '87.96', perCan: '5.50' }
        };

        // Variants — filter by bundle vs flavor
        let variantHtml = '';
        const PACK_LABELS = { '4': '4-Pack', '12': '12-Pack', '16': '16-Pack' };
        let displayIndex = 0;

        sortedVariants.forEach((variant) => {
            // Determine pack size label
            let variantLabel = variant.title;
            const qtyMatch = variantLabel.match(/(\d+)/);
            let packNum = null;
            if (qtyMatch && PACK_LABELS[qtyMatch[1]]) {
                variantLabel = PACK_LABELS[qtyMatch[1]];
                packNum = qtyMatch[1];
            } else if (variantLabel === 'Default Title') {
                variantLabel = '16-Pack';
                packNum = '16';
            }

            // Filter: bundles show 16-Pack only, flavors show 4-Pack and 12-Pack only
            if (isBundle && packNum !== '16') return;
            if (!isBundle && packNum === '16') return;

            // Override price for bundles
            let displayPrice = variant.price;
            let comparePrice = variant.compare_at_price;
            const bundleOverride = BUNDLE_PRICES[Number(targetProduct.id)];
            if (isBundle && bundleOverride) {
                displayPrice = bundleOverride.price;
            }

            if (displayIndex === 0) {
                let priceHtml = `$${displayPrice}`;
                if (comparePrice && parseFloat(comparePrice) > parseFloat(displayPrice)) {
                    priceHtml += ` <span class="strike">$${comparePrice}</span>`;
                }
                $('.product_price').html(priceHtml);
                $('.one_time_purchase .payable_amount').text(`$${displayPrice}`);

                // Update per-can price
                if (isBundle && bundleOverride) {
                    $('.price-per-can').text(`$${bundleOverride.perCan} per can`);
                } else {
                    const canCount = parseInt(packNum) || 1;
                    const perCan = (parseFloat(displayPrice) / canCount).toFixed(2);
                    $('.price-per-can').text(`$${perCan} per can`);
                }
            }

            variantHtml += `
            <div>
                <input class="btn-check quantity-input"
                    variant_price="${displayPrice}"
                    variant_compare_price="${comparePrice || ''}"
                    data-pack-num="${packNum}"
                    product_id="${targetProduct.id}"
                    variation="${variant.id}"
                    type="radio"
                    name="packQuantity"
                    id="variant-${variant.id}"
                    ${displayIndex === 0 ? 'checked' : ''}
                    value="${variantLabel.split('-',1)[0].trim()}">

                <label class="pill quantity-pill"
                    for="variant-${variant.id}"
                    ${packNum === '16' ? 'style="letter-spacing:0.1em;"' : ''}>
                    ${variantLabel}
                </label>
            </div>`;
            displayIndex++;
        });

        $('.variant').html(variantHtml);

        const activeVariation = $('.variant input:checked').attr('variation');
        $('.add-to-cart')
            .attr('variation', activeVariation)
            .attr('product_id', targetProduct.id);

        syncPlanPrices();
        toggleSubscriptionUI(targetProduct);

    }

    function applyLocalFlavor(flavor, strengthKey) {
        // Title
        $('.product_title').text(flavor.name);

        // Description — show flavor description
        $('.product-description').text(flavor.desc || '');

        // Determine image base from strength config
        const config = window.STRENGTH_FLAVORS[strengthKey];
        const imgBase = `assets/images/${config.imgBase}/${flavor.slug}/`;
        $('#mainImage').attr('src', imgBase + flavor.images[0]);

        let thumbHtml = '';
        flavor.images.forEach((file, i) => {
            const src = imgBase + file;
            thumbHtml += `<button class="thumb-btn${i === 0 ? ' active' : ''}" data-index="${i}" data-src="${src}">
                <div class="thumb"><img src="${src}" alt="${flavor.name} ${i + 1}"></div>
            </button>`;
        });
        $('.thumb-col').html(thumbHtml);

        // Hardcoded Light flavor prices
        const FLAVOR_PRICES = {
            '4': { oneTime: '16.99', subscribe: '13.59', perCanOneTime: '4.25', perCanSubscribe: '3.40' },
            '12': { oneTime: '44.99', subscribe: '35.99', perCanOneTime: '3.75', perCanSubscribe: '3.00' }
        };

        // Variants — 4-Pack and 12-Pack
        const packSizes = [
            { label: '4-Pack', num: '4', variantId: flavor.variants['4'].id },
            { label: '12-Pack', num: '12', variantId: flavor.variants['12'].id }
        ];

        let variantHtml = '';
        packSizes.forEach((pack, i) => {
            const pricing = FLAVOR_PRICES[pack.num];

            variantHtml += `
            <div>
                <input class="btn-check quantity-input"
                    variant_price="${pricing.oneTime}"
                    variant_compare_price=""
                    data-pack-num="${pack.num}"
                    data-subscribe-price="${pricing.subscribe}"
                    data-per-can-onetime="${pricing.perCanOneTime}"
                    data-per-can-subscribe="${pricing.perCanSubscribe}"
                    product_id="${config.productId}"
                    variation="${pack.variantId}"
                    type="radio"
                    name="packQuantity"
                    id="flavor-variant-${pack.variantId}"
                    ${i === 0 ? 'checked' : ''}
                    value="${pack.num}">
                <label class="pill quantity-pill" for="flavor-variant-${pack.variantId}">${pack.label}</label>
            </div>`;

            if (i === 0) {
                // Default to subscribe view
                $('.product_price').html(`$${pricing.subscribe}`);
                $('.one_time_purchase .payable_amount').text(`$${pricing.oneTime}`);
                $('.price-per-can').text(`$${pricing.perCanOneTime} per can`);
            }
        });
        $('.variant').html(variantHtml);

        // Update add-to-cart
        const firstVariantId = packSizes[0].variantId;
        $('.add-to-cart')
            .attr('variation', firstVariantId)
            .attr('product_id', config.productId);

        // Show subscription options for individual flavors
        $('.selling_plans .option-card.subscription').show();
        $('.selling_plans .subscribe-banner').show();
        $('.hover-wrapper').show();
        // Select subscription by default
        $('input[name="purchaseOption"][value="subscribe"]').prop('checked', true).trigger('change');
        $('.selling_plans .option-card').removeClass('active');
        $('.selling_plans .option-card.subscription').addClass('active');

        // Sync prices using hardcoded values
        const firstPricing = FLAVOR_PRICES['4'];
        $('.one_time_purchase input[name="purchaseOption"]').attr('plan_price', firstPricing.oneTime);
        $('.one_time_purchase .payable_amount').text(`$${firstPricing.oneTime}`);
        $('.selling_plans .option-card.subscription input[name="purchaseOption"]')
            .attr('plan_price', firstPricing.subscribe);
        $('.selling_plans .option-card.subscription .payable_amount').text(firstPricing.subscribe);
        $('.selling_plans .option-card.subscription .strike').text(`$${firstPricing.oneTime}`);
        $('.subscribe-per-can').text(`$${firstPricing.perCanSubscribe} per can`);
    }

    $(document).on('click', '.mc-flavor-pill', function () {
        const $pill = $(this);
        $('.mc-flavor-pill').removeClass('active');
        $pill.addClass('active');
        $pill.find('input').prop('checked', true);

        // If Variety pill clicked, switch back to the active strength bundle product
        if ($pill.hasClass('mc-variety-pill')) {
            const $activeStrength = $('.strength-pill.active');
            if ($activeStrength.length) {
                const bundleProductId = Number($activeStrength.data('product-id'));
                const bundleProduct = ALL_PRODUCTS.find((p) => Number(p.id) === bundleProductId);
                if (bundleProduct) applySelectedProduct(bundleProduct);
            }
            return;
        }

        // Handle local flavor selection
        if ($pill.hasClass('mc-local-flavor')) {
            const slug = $pill.data('flavor-slug');
            const strengthKey = $pill.data('strength') || 'light';
            const config = window.STRENGTH_FLAVORS[strengthKey];
            const flavor = config && config.flavors.find(f => f.slug === slug);
            if (!flavor) return;

            applyLocalFlavor(flavor, strengthKey);
            return;
        }

        const productId = parseInt($pill.attr('product_id'), 10);
        const product = ALL_PRODUCTS.find((p) => p.id === productId);
        applySelectedProduct(product);
    });

    /* -------------------------
       1. FETCH PRODUCTS ONCE
    ------------------------- */

    $.ajax({
        url: API_URL,
        type: "GET",
        dataType: "json",
        success: function (response) {

            ALL_PRODUCTS = response.products;

            // DEBUG: Log all selling plans from every product/variant
            console.log('=== SELLING PLANS DEBUG ===');
            ALL_PRODUCTS.forEach(product => {
                const plans = [];
                (product.variants || []).forEach(variant => {
                    (variant.selling_plan_allocations || []).forEach(alloc => {
                        plans.push({
                            product_id: product.id,
                            product_title: product.title,
                            variant_id: variant.id,
                            variant_title: variant.title,
                            selling_plan_id: alloc.selling_plan_id,
                            selling_plan_group_id: alloc.selling_plan_group_id,
                            price: alloc.price,
                            compare_at_price: alloc.compare_at_price
                        });
                    });
                });
                if (plans.length > 0) {
                    console.log(`Product: ${product.title} (ID: ${product.id})`);
                    console.table(plans);
                }
            });
            console.log('=== END SELLING PLANS ===');

            // Default to Light bundle (strength selector default)
            const lightBundleId = 8371013451949;

            // Add heading and flavor container
            if (!$('.mc-flavor-heading').length) {
                $('.product-flavour-variation').before('<div class="mc-flavor-heading" id="flavors-section">Select Flavor</div><div class="mc-flavor-wrap"></div>');
            }

            // All flavor configs keyed by strength
            window.STRENGTH_FLAVORS = {
                light: {
                    imgBase: '5mg',
                    bundleImg: 'assets/images/5mg/1.jpg',
                    productId: '8371013451949',
                    flavors: [
                        { name: 'Bright Berry', slug: 'bright-berry', images: ['1.jpg','2.png','3.jpg','4.jpg','5.jpg','6.jpg','7.jpg'], variants: { '4': { id: '43706600226989' }, '12': { id: '43476426260653' } }, desc: 'Bright Berry is a refreshing burst of mixed berries with a juicy natural sweetness balanced with a touch of tart. It has a gentle fizz that adds a crisp finish.' },
                        { name: 'Squeeze of Lime', slug: 'lime', images: ['1.jpg','2.jpg','3.png','4.jpg','5.jpg','6.jpg','7.jpg'], variants: { '4': { id: '43706638991533' }, '12': { id: '43644594618541' } }, desc: 'Crisp, clean, and just the right amount of tang, this seltzer is bright without being too bold.' },
                        { name: 'Tropical Mango', slug: 'mango', images: ['1.jpg','2.png','3.jpg','4.jpg','5.jpg','6.jpg','7.jpg'], variants: { '4': { id: '43706652000429' }, '12': { id: '43644594421933' } }, desc: 'Tropical, smooth, and oh-so-delicious, this seltzer brings you ripe flavor in a light and sessionable drink without being overly sweet.' },
                        { name: 'Juicy Watermelon', slug: 'watermelon', images: ['1.jpg','2.png','3.jpg','4.jpg','5.jpg','6.jpg','7.jpg'], variants: { '4': { id: '43706563559597' }, '12': { id: '43644594520237' } }, desc: 'Juicy, sweet, and incredibly refreshing, this seltzer brings you the ripe taste of summer in a can.' }
                    ]
                },
                moderate: {
                    imgBase: '10mg',
                    bundleImg: 'assets/images/10mg/1.jpg',
                    productId: '8449097007277',
                    flavors: [
                        { name: 'Passion Fruit', slug: 'passion-fruit', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg','7.jpg'], variants: { '4': { id: '44305077665965' }, '12': { id: '44305077698733' } }, desc: 'Bursting with juicy sweetness with a hint of tart citrus, welcome to sunshine in a can.' },
                        { name: 'Blood Orange', slug: 'blood-orange', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg','7.jpg'], variants: { '4': { id: '44305076453549' }, '12': { id: '44305076486317' } }, desc: 'Let your taste buds bathe in sun-ripened blood orange. This is a crisp and smooth tasting seltzer for winding down without feeling weighed down.' },
                        { name: 'Pink Lemonade', slug: 'pink-lemonade', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg','7.jpg'], variants: { '4': { id: '44305071112365' }, '12': { id: '44305071145133' } }, desc: 'A burst of tangy lemon and sweet red berries makes every sip feel like a refreshing escape. It finishes with a crisp, clean zest.' },
                        { name: 'Blueberry', slug: 'blueberry', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg','7.jpg'], variants: { '4': { id: '44305054793901' }, '12': { id: '44305054826669' } }, desc: 'A juicy blend of ripe blueberries and smooth acai brings together the perfect balance of sweet and tangy, like a wellness retreat in a bottle.' }
                    ]
                },
                experience: {
                    imgBase: '20mg',
                    bundleImg: 'assets/images/20mg/1.jpg',
                    productId: '8449097433261',
                    flavors: [
                        { name: 'Passion Fruit', slug: 'passion-fruit', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg'], variants: { '4': { id: '43644594290861' }, '12': { id: '44031199215789' } }, desc: 'Bursting with juicy sweetness with a hint of tart citrus, welcome to sunshine in a can.' },
                        { name: 'Blood Orange', slug: 'blood-orange', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg'], variants: { '4': { id: '43644594356397' }, '12': { id: '43916737282221' } }, desc: 'Let your taste buds bathe in sun-ripened blood orange. This is a crisp and smooth tasting seltzer for winding down without feeling weighed down.' },
                        { name: 'Pink Lemonade', slug: 'pink-lemonade', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg'], variants: { '4': { id: '43644596551853' }, '12': { id: '44031200755885' } }, desc: 'A burst of tangy lemon and sweet red berries makes every sip feel like a refreshing escape. It finishes with a crisp, clean zest.' },
                        { name: 'Blueberry', slug: 'blueberry', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg'], variants: { '4': { id: '43644596715693' }, '12': { id: '43644596748461' } }, desc: 'A juicy blend of ripe blueberries and smooth acai brings together the perfect balance of sweet and tangy, like a wellness retreat in a bottle.' }
                    ]
                }
            };

            // Build flavor pills for active strength
            window.buildFlavorPills = function(strengthKey) {
                const config = window.STRENGTH_FLAVORS[strengthKey];
                if (!config) return;

                const varietyPill = `<div class="mc-flavor-pill mc-variety-pill active" product_id="bundle">
                    <input type="radio" name="the_variety_pack" data_id="bundle" checked>
                    <div class="mc-flavor-img-wrap">
                        <img src="${config.bundleImg}" alt="Variety">
                    </div>
                    <span class="mc-flavor-label">Variety</span>
                </div>`;

                let flavorHtml = '';
                config.flavors.forEach((flavor) => {
                    const thumbSrc = `assets/images/${config.imgBase}/${flavor.slug}/1.jpg`;
                    flavorHtml += `
                    <div class="mc-flavor-pill mc-local-flavor" data-flavor-slug="${flavor.slug}" data-strength="${strengthKey}">
                        <input type="radio" name="the_variety_pack">
                        <div class="mc-flavor-img-wrap">
                            <img src="${thumbSrc}" alt="${flavor.name}">
                        </div>
                        <span class="mc-flavor-label">${flavor.name}</span>
                    </div>`;
                });

                $('.mc-flavor-wrap').html(varietyPill + flavorHtml);
            };

            // Build initial Light flavors
            window.buildFlavorPills('light');
            // On initial load, apply the Light bundle product (from strength selector)
            const lightProduct = ALL_PRODUCTS.find((p) => Number(p.id) === lightBundleId);
            if (lightProduct) {
                applySelectedProduct(lightProduct);
            }
            document.querySelector(".product-wrap").style.visibility = "visible";
        }
    });

    /* -------------------------
       3. UPDATE VARIANT
    ------------------------- */

    $(document).on('change', '.quantity-input', function () {
        const newVariation = $(this).attr('variation');
        const variation_price = $(this).attr('variant_price');
        const compare_price = $(this).attr('variant_compare_price');
        const packNum = $(this).attr('data-pack-num');
        const subscribePrice = $(this).attr('data-subscribe-price');
        const perCanOneTime = $(this).attr('data-per-can-onetime');
        const perCanSubscribe = $(this).attr('data-per-can-subscribe');

        // Check if this is a flavor with hardcoded prices
        const isFlavorVariant = !!subscribePrice;

        if (isFlavorVariant) {
            // Use hardcoded flavor prices
            const isSubscribeActive = $('input[name="purchaseOption"][value="subscribe"]').is(':checked');
            if (isSubscribeActive) {
                $('.product_price').html(`$${subscribePrice}`);
            } else {
                $('.product_price').html(`$${variation_price}`);
            }

            // Update subscription box prices
            $('.one_time_purchase input[name="purchaseOption"]').attr('plan_price', variation_price);
            $('.one_time_purchase .payable_amount').text(`$${variation_price}`);
            $('.selling_plans .option-card.subscription input[name="purchaseOption"]')
                .attr('plan_price', subscribePrice);
            $('.selling_plans .option-card.subscription .payable_amount').text(subscribePrice);
            $('.selling_plans .option-card.subscription .strike').text(`$${variation_price}`);
            $('.subscribe-per-can').text(`$${perCanSubscribe} per can`);

            // Per-can price
            $('.price-per-can').text(`$${perCanOneTime} per can`);
        } else {
            let priceHtml = '$' + variation_price;
            if (compare_price && parseFloat(compare_price) > parseFloat(variation_price)) {
                priceHtml += ` <span class="strike">$${compare_price}</span>`;
            }
            $('.product_price').html(priceHtml);

            // Update per-can price for bundles
            const BUNDLE_PRICES = {
                8371013451949: '4.37',
                8449097007277: '4.75',
                8449097433261: '5.50'
            };
            const productId = Number($(this).attr('product_id'));
            if (BUNDLE_PRICES[productId]) {
                $('.price-per-can').text(`$${BUNDLE_PRICES[productId]} per can`);
            } else {
                const canCount = parseInt(packNum) || 1;
                const perCan = (parseFloat(variation_price) / canCount).toFixed(2);
                $('.price-per-can').text(`$${perCan} per can`);
            }

            syncPlanPrices();
        }

        $('.add-to-cart').attr('variation', newVariation);
        toggleSubscriptionUI(CURRENT_PRODUCT);
    });

    $('.selling_plans .option-card select').change(function () {
        syncPlanPrices();
    });

    $(document).on('change', 'input[name="purchaseOption"]', function () {
        $('.selling_plans .option-card').removeClass('active');
        $(this).closest('.option-card').addClass('active');

        // Update main price display for flavor products with hardcoded prices
        const $checkedVariant = $('.variant input:checked');
        const subscribePrice = $checkedVariant.attr('data-subscribe-price');
        if (subscribePrice) {
            const oneTimePrice = $checkedVariant.attr('variant_price');
            const perCanOneTime = $checkedVariant.attr('data-per-can-onetime');
            const perCanSubscribe = $checkedVariant.attr('data-per-can-subscribe');
            const isSubscribe = $(this).val() === 'subscribe';
            $('.product_price').html(`$${isSubscribe ? subscribePrice : oneTimePrice}`);
            $('.price-per-can').text(`$${isSubscribe ? perCanSubscribe : perCanOneTime} per can`);
        }
    });

    // Click anywhere on card to select
    $(document).on('click', '.option-card', function (e) {
        if ($(e.target).is('select') || $(e.target).is('option')) return;
        const $radio = $(this).find('input[name="purchaseOption"]');
        if ($radio.length && !$radio.prop('checked')) {
            $radio.prop('checked', true).trigger('change');
        }
    });

    /* -------------------------
       4. ADD TO CART
    ------------------------- */

    $('.add-to-cart').on('click', function () {

        const productId = $(this).attr('product_id');
        const variationId = $(this).attr('variation');
        const title = $('.product_title').text();
        
        // Pack size label - don't append -PACK if variant already has a clean name
        const variantVal = $(`input[variation="${variationId}"]`).val() || '';
        const packSize = variantVal.toLowerCase().includes('can') ? variantVal : variantVal + "-PACK";
        
        // Determine price and selling plan
        let price;
        let sellingPlanId;
        const BUNDLE_IDS = [8371013451949, 8449097007277, 8449097433261];
        const isBundleProduct = BUNDLE_IDS.includes(Number(productId));
        const isVarietySelected = $('.mc-variety-pill').hasClass('active');

        if (isBundleProduct && isVarietySelected) {
            // Bundle/Variety — one-time purchase only, no selling plan
            price = getCurrentVariantPrice();
            sellingPlanId = null;
        } else {
            price = parseFloat($('.option-card input:checked').attr('plan_price').replace('$', ''));
            sellingPlanId = $('.selling_plans input:checked').attr('selling_plan') || null;
        }

        const image = $('#mainImage').attr('src');

        const existingItem = cart.find((item) =>
            item.variationId === variationId && item.sellingPlanId === sellingPlanId
        );

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                productId,
                variationId,
                title,
                packSize,
                price,
                image,
                quantity: 1,
                sellingPlanId
            });
        }

        saveAndRender();
    });

    /* -------------------------
       5. CART CONTROLS
    ------------------------- */

    const $cartContainer = $('.mini-cart-items');

    $cartContainer.on('click', '.plus', function () {
        const index = $(this).closest('.cart-item').data('index');
        cart[index].quantity++;
        saveAndRender();
    });

    $cartContainer.on('click', '.minus', function () {
        const index = $(this).closest('.cart-item').data('index');

        if (cart[index].quantity > 1) {
            cart[index].quantity--;
        } else {
            cart.splice(index, 1);
        }

        saveAndRender();
    });

    $cartContainer.on('click', '.remove-item', function () {
        const index = $(this).closest('.cart-item').data('index');
        cart.splice(index, 1);
        saveAndRender();
    });

    /* -------------------------
       6. SAVE + RENDER
    ------------------------- */

    function saveAndRender() {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        renderCart();
    }

    function renderCart() {

        const baseUrl = "https://bfac5a-e3.myshopify.com";
        $cartContainer.empty();
        let subtotal = 0;

        if (cart.length === 0) {
            $cartContainer.html('<p class="text-center mt-4">Your cart is empty.</p>');
            $('.offcanvas-body .border-top span:last-child').text('$0.00');
            $('.offcanvas a.checkout').attr('href', `${baseUrl}/checkout`);
            return;
        }

        let finalReturn = "/checkout";

        cart.forEach((item, index) => {

            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            let itemHtml = `
            <div class="cart-item d-flex gap-3 mb-4" data-index="${index}">
                <img src="${item.image}" 
                     alt="${item.title}" 
                     class="rounded-3" 
                     width="88" 
                     height="88" 
                     style="object-fit:cover;">

                <div class="flex-grow-1">
                    <div class="fw-semibold clr-green">
                        ${item.title}
                    </div>

                    <div class="text-muted small">
                        ${item.packSize}
                    </div>

                    <div class="d-flex align-items-center justify-content-between mt-2">

                        <div class="input-group input-group-sm" style="width: 100px;">
                            <button class="btn btn-outline-secondary minus" type="button">-</button>
                            
                            <input type="text" 
                                   class="form-control text-center bg-white" 
                                   value="${item.quantity}" 
                                   readonly>

                            <button class="btn btn-outline-secondary plus" type="button">+</button>
                        </div>

                        <div class="fw-semibold clr-green">
                            $${itemTotal.toFixed(2)}
                        </div>

                    </div>

                    <button class="btn btn-link p-0 mt-2 small text-decoration-none remove-item text-danger">
                        Remove
                    </button>
                </div>
            </div>`;

            $cartContainer.append(itemHtml);

            let addUrl = `/cart/add?id=${item.variationId}&quantity=${item.quantity}`;
            if (item.sellingPlanId) {
                addUrl += `&selling_plan=${item.sellingPlanId}`;
            }

            addUrl += `&return_to=${encodeURIComponent(finalReturn)}`;
            finalReturn = addUrl;
        });

        let Checkout_URL = `${baseUrl}/cart/clear?return_to=${encodeURIComponent(finalReturn)}`;

        $('.offcanvas a.checkout').attr('href', Checkout_URL);
        $('.offcanvas-body .border-top span:last-child').text(`$${subtotal.toFixed(2)}`);
    }

    /* -------------------------
       STRENGTH SELECTOR
    ------------------------- */

    const STRENGTH_TITLES = {
        light: '5 Sampler Pack',
        moderate: '10 Sampler Pack',
        experience: '20 Sampler Pack'
    };

    $(document).on('click', '.strength-pill', function () {
        const $pill = $(this);

        // Update pill styles
        $('.strength-pill').css({ background: '#f0f0f0', color: '#333', borderColor: '#e0e0e0' });
        $pill.css({ background: '#2D2B5E', color: '#fff', borderColor: '#2D2B5E' });
        $('.strength-pill').removeClass('active');
        $pill.addClass('active');

        // Update product title
        const strength = $pill.data('strength');
        $('.product_title').text(STRENGTH_TITLES[strength] || '');

        // Rebuild flavor pills for new strength and select Variety
        if (window.buildFlavorPills) {
            window.buildFlavorPills(strength);
        }

        // Switch product by ID
        const productId = Number($pill.data('product-id'));
        const product = ALL_PRODUCTS.find((p) => Number(p.id) === productId);
        if (product) {
            applySelectedProduct(product);
        }

        // Update add-to-cart product_id
        $('.add-to-cart').attr('product_id', productId);
    });

    renderCart();
});

function updateImage() {

    const $mainImage = $("#mainImage");

    $(document).off("click.thumb").on("click.thumb", ".thumb-btn", function () {

        const $btn = $(this);
        const src = $btn.data("src");

        if (src) {
            $mainImage.attr("src", src);
        }

        $(".thumb-btn").removeClass("active");
        $btn.addClass("active");

    });
}
