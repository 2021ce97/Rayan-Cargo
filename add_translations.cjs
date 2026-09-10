const fs = require('fs');
let content = fs.readFileSync('src/i18n/translations.ts', 'utf8');

const newEn = `
    route_from: 'From',
    route_to: 'To',
    auto_math: 'Auto Math',
    consignment_lifecycle_path: 'Consignment Lifecycle Path',
    lifecycle_origin_msg: 'Origin Branch ({branch}): Controls Booked ➔ In Transit (Dispatches to highway).',
    lifecycle_dest_msg: 'Destination Branch ({branch}): Controls Received at Branch ➔ Out for Delivery ➔ Delivered.',
    table_destination: 'Destination',
    table_weight: 'Weight',
    table_pcs: 'Pcs',
    table_payment: 'Payment',
    table_sign: 'Sign',
    status_verified_pre_book: 'Verified Pre-Book',
    clear_partner_filter: 'Clear Partner Filter ✕',
    all_5_partners: 'All 5 Partners',
    live_synced: 'Live Synced',
    syncing: 'Syncing...',
    print_selected: 'Print Selected / چاپ',
    print_selected_count: 'Print Selected / چاپ ({count})',
    online_pre_book_tag: 'Online Pre-Book',
    set_on_scale: 'Set on scale intake',
    confirm_customer_pre_booking: 'Confirm Customer Pre-Booking',
`;

const newFa = `
    route_from: 'از (مبدأ)',
    route_to: 'به (مقصد)',
    auto_math: 'محاسبه خودکار',
    consignment_lifecycle_path: 'مسیر چرخه حیات مرسوله',
    lifecycle_origin_msg: 'نمایندگی مبدأ ({branch}): کنترل ثبت شده ➔ در حال انتقال (ارسال به جاده).',
    lifecycle_dest_msg: 'نمایندگی مقصد ({branch}): کنترل دریافت شده در نمایندگی ➔ در حال توزیع ➔ تحویل داده شده.',
    table_destination: 'مقصد',
    table_weight: 'وزن',
    table_pcs: 'تعداد',
    table_payment: 'پرداخت',
    table_sign: 'امضا',
    status_verified_pre_book: 'پیش‌ثبت تایید شده',
    clear_partner_filter: 'پاک کردن فیلتر همکار ✕',
    all_5_partners: 'همه ۵ همکار',
    live_synced: 'همگام‌سازی زنده',
    syncing: 'در حال همگام‌سازی...',
    print_selected: 'چاپ انتخاب‌شده‌ها',
    print_selected_count: 'چاپ انتخاب‌شده‌ها ({count})',
    online_pre_book_tag: 'پیش‌ثبت آنلاین',
    set_on_scale: 'تعیین روی ترازو',
    confirm_customer_pre_booking: 'تایید پیش‌ثبت مشتری',
`;

content = content.replace(/fill_contacts_warning: 'Please fill in sender and receiver contact details.'\n  \},/g, "fill_contacts_warning: 'Please fill in sender and receiver contact details.'," + newEn + "\n  },");

content = content.replace(/fill_contacts_warning: 'لطفاً معلومات تماس فرستنده و گیرنده را تکمیل نمایید.'\n  \},/g, "fill_contacts_warning: 'لطفاً معلومات تماس فرستنده و گیرنده را تکمیل نمایید.'," + newFa + "\n  },");

fs.writeFileSync('src/i18n/translations.ts', content, 'utf8');
