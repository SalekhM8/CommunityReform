/* ==========================================================================
   Childcare Enquiry Form
   Community Reform CIC
   --------------------------------------------------------------------------
   Runs entirely in the browser. There is no server to maintain.

   HOW IT WORKS
   1. On load we ask Cal.com (free plan) for genuinely available appointment
      slots and cache them for the next few months.
   2. The visitor only ever sees dates and times that are actually free, so
      double bookings cannot happen.
   3. On submit we create the booking through Cal.com's public booking
      endpoint and pass the whole enquiry along with it.
   4. Cal.com then automatically:
        - emails the parent a confirmation
        - notifies info@crcic.co.uk of the new booking
        - emails both of them a reminder the day before the appointment
      (set this up once in Cal.com - see CALCOM-SETUP.md)
   ========================================================================== */

(function () {
    'use strict';

    /* =====================================================================
       1. CONFIGURATION
       ---------------------------------------------------------------------
       Fill in `username` and `eventTypeSlug` after creating your free
       Cal.com account. Full walkthrough: CALCOM-SETUP.md
       ===================================================================== */

    const CALCOM = {
        // Your Cal.com booking link is cal.com/USERNAME/EVENT-TYPE-SLUG
        username: 'crcic',            // our Cal.com booking page: cal.com/crcic
        eventTypeSlug: 'childcare-appointment',
        eventTypeId: null,            // optional number - if set, used instead of username/slug

        // How far ahead we look for appointments, and the page's timezone
        timeZone: 'Europe/London',
        slotsAheadDays: 120,

        // Cal.com API versions (leave as-is unless Cal.com tells you otherwise)
        slotsApiVersion: '2024-09-04',
        bookingsApiVersion: '2024-08-13',

        // Optional: map form answers to booking questions you created in Cal.com.
        // Each value is either a key from the collected answers in `collect()`
        // or one of the derived tokens handled in `resolveBookingFields()`:
        //   'summary', 'childrenText', 'benefitsText' or 'consentText'.
        // The slugs must match the booking questions set up in Cal.com.
        bookingFields: {
            address: 'address',
            postcode: 'postcode',
            children: 'childrenText',
            employment: 'employment',
            benefits: 'benefitsText',
            support: 'support',
            consent: 'consentText'
        },

        // Only set this if the event type uses an in-person location, e.g. 'address'
        locationType: ''
    };

    /* =====================================================================
       2. Small helpers
       ===================================================================== */

    const API_BASE = 'https://api.cal.com/v2';
    const CONTACT_EMAIL = 'info@crcic.co.uk';
    const CONTACT_PHONE_DISPLAY = '07359 725 058';

    // Lets a page override the settings above without editing this file, e.g.
    //   <script>window.CRC_CALCOM = { username: 'x', eventTypeSlug: 'y' };</script>
    if (window.CRC_CALCOM && typeof window.CRC_CALCOM === 'object') {
        Object.assign(CALCOM, window.CRC_CALCOM);
    }

    const CHILD_AGE_OPTIONS = [
        'Under 1', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', '10', '11', '12', '13', '14', '15', '16+'
    ];

    const $ = (selector, root) => (root || document).querySelector(selector);
    const $$ = (selector, root) => Array.prototype.slice.call((root || document).querySelectorAll(selector));

    const form = $('#childcareForm');
    if (!form) return; // not on the enquiry page

    const els = {
        childCount: $('#childCount'),
        childAges: $('#childAges'),
        childAgesNote: $('#childAgesNote'),
        benefitOther: $('#benefitOther'),
        benefitNone: $('#benefitNone'),
        benefitUnsure: $('#benefitUnsure'),
        otherBenefitField: $('#otherBenefitField'),
        otherBenefit: $('#otherBenefit'),
        apptDate: $('#apptDate'),
        apptTime: $('#apptTime'),
        datePicker: $('#datePicker'),
        dpMonth: $('#dpMonth'),
        dpGrid: $('#dpGrid'),
        dpPrev: $('#dpPrev'),
        dpNext: $('#dpNext'),
        bookingFields: $('#bookingFields'),
        bookingUnavailable: $('#bookingUnavailable'),
        slotStatus: $('#slotStatus'),
        submitBtn: $('#submitBtn'),
        formMessage: $('#formMessage'),
        success: $('#enqSuccess')
    };

    // date (YYYY-MM-DD) -> array of ISO slot timestamps
    let slotsByDate = {};
    let slotsLoaded = false;
    const pageLoadedAt = Date.now();

    const isConfigured = () =>
        Boolean(CALCOM.eventTypeId || (CALCOM.username && CALCOM.eventTypeSlug));

    /* =====================================================================
       3. Formatting helpers
       ===================================================================== */

    function toIsoDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function formatDateHuman(isoDate) {
        const parts = isoDate.split('-').map(Number);
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    function formatTimeHuman(isoDateTime) {
        const date = new Date(isoDateTime);
        // Always show the time in the centre's timezone, so a parent browsing from
        // abroad (or with their phone set elsewhere) still sees the real appointment time.
        return date.toLocaleTimeString('en-GB', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CALCOM.timeZone
        }).replace(/\s/g, '').toLowerCase();
    }

    function normalisePhone(number) {
        // Cal.com validates the number, so turn UK formats into +44 E.164:
        //   07359 725058  ->  +447359725058
        //   +44 7359...   ->  +447359...
        // Anything we cannot recognise is passed through untouched and Cal.com
        // will report it; the form itself does not reject unusual numbers.
        let cleaned = String(number || '').replace(/[^\d+]/g, '');
        if (!cleaned) return '';

        if (cleaned.indexOf('00') === 0) cleaned = '+' + cleaned.slice(2);

        // "+44 (0)7359..." arrives as "+4407359..." - drop the trunk zero
        if (cleaned.indexOf('+44') === 0) {
            return '+44' + cleaned.slice(3).replace(/^0+/, '');
        }
        if (cleaned.indexOf('+') === 0) return cleaned;
        if (cleaned.charAt(0) === '0') return '+44' + cleaned.replace(/^0+/, '');
        if (/^7\d{9}$/.test(cleaned)) return '+44' + cleaned;

        return cleaned;
    }

    function setStatus(message, tone) {
        els.slotStatus.textContent = message || '';
        els.slotStatus.className = 'enq-slot-status' + (tone ? ' ' + tone : '');
    }

    function showMessage(message, tone) {
        els.formMessage.innerHTML = message;
        els.formMessage.className = 'enq-message ' + (tone || 'info');
        els.formMessage.hidden = false;
        els.formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* =====================================================================
       4. Section 2 - children and their ages
       ===================================================================== */

    function renderChildAges() {
        const raw = els.childCount.value;
        const count = raw === '6+' ? 6 : parseInt(raw, 10) || 0;

        // remember what has already been chosen so re-rendering doesn't lose it
        const previous = $$('select[name^="childAge"]', els.childAges).map(s => s.value);

        els.childAges.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const field = document.createElement('div');
            field.className = 'enq-field';

            const label = document.createElement('label');
            const inputId = 'childAge' + (i + 1);
            label.setAttribute('for', inputId);
            label.innerHTML = 'Age of child ' + (i + 1) + ' <span class="req" aria-hidden="true">*</span>';

            const select = document.createElement('select');
            select.id = inputId;
            select.name = 'childAge' + (i + 1);
            select.required = true;

            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Please select';
            select.appendChild(placeholder);

            CHILD_AGE_OPTIONS.forEach(function (option) {
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = option;
                select.appendChild(opt);
            });

            if (previous[i]) select.value = previous[i];

            const error = document.createElement('span');
            error.className = 'enq-error-msg';
            error.setAttribute('data-error-for', select.name);

            field.appendChild(label);
            field.appendChild(select);
            field.appendChild(error);
            els.childAges.appendChild(field);
        }

        els.childAgesNote.hidden = raw !== '6+';
    }

    els.childCount.addEventListener('change', renderChildAges);

    /* =====================================================================
       5. Section 4 - benefits (None of the above / Not sure win)
       ===================================================================== */

    function handleBenefitChange(event) {
        const target = event.target;
        if (target.type !== 'checkbox') return;

        // "None of the above" and "Not sure" are exclusive answers
        if (target === els.benefitNone || target === els.benefitUnsure) {
            if (target.checked) {
                $$('input[name="benefits"]').forEach(function (box) {
                    if (box !== target) box.checked = false;
                });
            }
        } else if (target.checked) {
            els.benefitNone.checked = false;
            els.benefitUnsure.checked = false;
        }

        els.otherBenefitField.hidden = !els.benefitOther.checked;
        if (!els.benefitOther.checked) {
            els.otherBenefit.value = '';
            clearFieldError('otherBenefit');
        }
    }

    $$('input[name="benefits"]').forEach(function (box) {
        box.addEventListener('change', handleBenefitChange);
    });

    /* =====================================================================
       6. Validation
       ===================================================================== */

    function setFieldError(name, message) {
        const slot = $('[data-error-for="' + name + '"]');
        if (slot) slot.textContent = message;
        const input = form.elements[name];
        if (input && input.classList) input.classList.add('enq-invalid');
        if (name === 'apptDate' && els.datePicker) els.datePicker.classList.add('enq-invalid');
    }

    function clearFieldError(name) {
        const slot = $('[data-error-for="' + name + '"]');
        if (slot) slot.textContent = '';
        const input = form.elements[name];
        if (input && input.classList) input.classList.remove('enq-invalid');
        if (name === 'apptDate' && els.datePicker) els.datePicker.classList.remove('enq-invalid');
    }

    function clearAllErrors() {
        $$('.enq-error-msg').forEach(function (slot) { slot.textContent = ''; });
        $$('.enq-invalid').forEach(function (el) { el.classList.remove('enq-invalid'); });
    }

    function validate() {
        clearAllErrors();
        let firstProblem = null;

        const problem = function (name, message, element) {
            setFieldError(name, message);
            if (!firstProblem) firstProblem = element || form.elements[name] || null;
        };

        const value = function (name) {
            const el = form.elements[name];
            return el ? String(el.value || '').trim() : '';
        };

        // --- Parent / carer details (all required) ---
        if (!value('fullName')) problem('fullName', 'Please enter your full name.');
        if (!value('phone')) {
            problem('phone', 'Please enter a phone number we can reach you on.');
        } else if (value('phone').replace(/\D/g, '').length < 10) {
            problem('phone', 'Please check this phone number - it looks too short.');
        }
        if (!value('email')) {
            problem('email', 'Please enter an email address so we can confirm your appointment.');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value('email'))) {
            problem('email', 'Please check this email address - it does not look complete.');
        }
        if (!value('address')) problem('address', 'Please enter your home address.');
        if (!value('postcode')) {
            problem('postcode', 'Please enter your postcode.');
        } else if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(value('postcode').trim())) {
            problem('postcode', 'Please check this UK postcode, for example B5 7PH.');
        }

        // --- Children ---
        if (!value('childCount')) {
            problem('childCount', 'Please tell us how many children you have.');
        } else {
            let missingAge = false;
            $$('select[name^="childAge"]', els.childAges).forEach(function (select) {
                if (!select.value) {
                    missingAge = true;
                    setFieldError(select.name, 'Please choose an age.');
                }
            });
            if (missingAge && !firstProblem) firstProblem = $('select[name^="childAge"]', els.childAges);
        }

        // --- Employment ---
        if (!$('input[name="employment"]:checked')) {
            problem('employment', 'Please choose the option that best describes your situation.');
        }

        // --- Benefits ---
        const benefits = $$('input[name="benefits"]:checked');
        if (benefits.length === 0) {
            problem('benefits', 'Please choose at least one option, or select "Not sure".');
        } else if (els.benefitOther.checked && !value('otherBenefit')) {
            problem('otherBenefit', 'Please tell us which other support you receive.');
        }

        // --- Childcare support ---
        if (!$('input[name="support"]:checked')) {
            problem('support', 'Please let us know what you need help with.');
        }

        // --- Appointment ---
        if (isConfigured()) {
            if (!value('apptDate')) {
                problem('apptDate', 'Please choose a date for your appointment.', els.datePicker);
            } else if (!slotsByDate[value('apptDate')] || !slotsByDate[value('apptDate')].length) {
                problem('apptDate', 'There are no appointments left on that date. Please choose another.', els.datePicker);
            }
            if (!value('apptTime')) {
                problem('apptTime', 'Please choose an appointment time.', els.apptTime);
            }
        }

        // --- Consent ---
        if (!form.elements.consent.checked) {
            problem('consent', 'Please tick this box so we can contact you about your enquiry.');
        }

        if (firstProblem) {
            if (firstProblem.focus) firstProblem.focus({ preventScroll: true });
            firstProblem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            showMessage('Please check the highlighted fields and try again.', 'error');
            return false;
        }

        return true;
    }

    // Clear an error as soon as the visitor fixes it
    form.addEventListener('input', function (event) {
        const name = event.target.name;
        if (!name) return;
        if ($('[data-error-for="' + name + '"]')) clearFieldError(name);
        if (event.target.type === 'radio' || event.target.type === 'checkbox') {
            $$('input[name="' + name + '"]').forEach(function (input) {
                clearFieldError(input.name);
            });
        }
    });

    /* =====================================================================
       7. Appointment availability from Cal.com
       ===================================================================== */

    function slotUrl(style) {
        const params = new URLSearchParams();

        if (CALCOM.eventTypeId) {
            params.set('eventTypeId', CALCOM.eventTypeId);
        } else if (style === 'legacy') {
            params.set('eventSlug', CALCOM.eventTypeSlug);
            params.set('username', CALCOM.username);
        } else {
            params.set('eventTypeSlug', CALCOM.eventTypeSlug);
            params.set('username', CALCOM.username);
        }

        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + CALCOM.slotsAheadDays);

        if (style === 'legacy') {
            params.set('startTime', start.toISOString());
            params.set('endTime', end.toISOString());
        } else {
            params.set('start', toIsoDate(start));
            params.set('end', toIsoDate(end));
        }

        params.set('timeZone', CALCOM.timeZone);
        return API_BASE + '/slots?' + params.toString();
    }

    async function requestSlots() {
        const styles = CALCOM.eventTypeId ? ['standard'] : ['standard', 'legacy'];

        for (const style of styles) {
            try {
                const response = await fetch(slotUrl(style), {
                    headers: { 'cal-api-version': CALCOM.slotsApiVersion }
                });

                if (!response.ok) continue;

                const payload = await response.json();
                const data = payload && payload.data ? payload.data : payload;

                if (data && typeof data === 'object') {
                    // normalise to date -> [ISO times]
                    const map = {};
                    Object.keys(data).forEach(function (key) {
                        const times = Array.isArray(data[key]) ? data[key].map(function (slot) {
                            return typeof slot === 'string' ? slot : (slot && (slot.start || slot.time)) || '';
                        }).filter(Boolean) : [];
                        map[key] = times;
                    });
                    return map;
                }
            } catch (error) {
                // try the next request style
            }
        }

        return null;
    }

    function availableDates() {
        return Object.keys(slotsByDate)
            .filter(function (date) { return slotsByDate[date].length > 0; })
            .sort();
    }

    function updateTimeOptions() {
        const date = els.apptDate.value;
        const times = (date && slotsByDate[date]) || [];

        els.apptTime.innerHTML = '';

        if (!date) {
            els.apptTime.disabled = true;
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Choose a date first';
            els.apptTime.appendChild(option);
            return;
        }

        if (!times.length) {
            els.apptTime.disabled = true;
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No appointments on this date';
            els.apptTime.appendChild(option);

            const next = availableDates().filter(function (d) { return d >= date; }).slice(0, 3);
            if (next.length) {
                setStatus('No appointments left on that date. The next available dates are ' +
                    next.map(function (d) { return formatDateHuman(d); }).join(', ') + '.', 'warn');
            } else {
                setStatus('We have no appointments left on that date. Please call us on ' +
                    CONTACT_PHONE_DISPLAY + ' and we will find a time for you.', 'warn');
            }
            return;
        }

        els.apptTime.disabled = false;
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a time';
        els.apptTime.appendChild(placeholder);

        times.forEach(function (iso) {
            const option = document.createElement('option');
            option.value = new Date(iso).toISOString();   // Cal.com expects UTC
            option.textContent = formatTimeHuman(iso);
            els.apptTime.appendChild(option);
        });

        setStatus(times.length + (times.length === 1 ? ' appointment available' : ' appointments available') +
            ' on ' + formatDateHuman(date) + '.', 'success');
    }

    /* ---- inline calendar ------------------------------------------------ */

    let calendarMonth = null;   // { year, month } — month is 0-based

    function monthIndexOf(month) {
        return month.year * 12 + month.month;
    }

    function monthFromIso(iso) {
        const parts = iso.split('-').map(Number);
        return { year: parts[0], month: parts[1] - 1 };
    }

    function calendarMonths() {
        const months = availableDates().map(monthFromIso);
        return months.filter(function (month, index) {
            return index === 0 || monthIndexOf(month) !== monthIndexOf(months[index - 1]);
        });
    }

    function updateCalendarNav() {
        const months = calendarMonths();

        if (!calendarMonth || !months.length) {
            els.dpPrev.disabled = true;
            els.dpNext.disabled = true;
            return;
        }

        const current = monthIndexOf(calendarMonth);
        els.dpPrev.disabled = current <= monthIndexOf(months[0]);
        els.dpNext.disabled = current >= monthIndexOf(months[months.length - 1]);
    }

    function renderCalendar() {
        if (!calendarMonth) return;

        const year = calendarMonth.year;
        const month = calendarMonth.month;
        const firstOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const lead = (firstOfMonth.getDay() + 6) % 7;   // Monday-first offset
        const today = toIsoDate(new Date());
        const selected = els.apptDate.value;

        els.dpMonth.textContent = firstOfMonth.toLocaleDateString('en-GB', {
            month: 'long', year: 'numeric'
        });

        els.dpGrid.innerHTML = '';

        for (let i = 0; i < lead; i += 1) {
            const spacer = document.createElement('span');
            spacer.className = 'enq-dp-spacer';
            spacer.setAttribute('aria-hidden', 'true');
            els.dpGrid.appendChild(spacer);
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            const iso = year + '-' + String(month + 1).padStart(2, '0') + '-' +
                String(day).padStart(2, '0');
            const times = slotsByDate[iso] || [];
            const button = document.createElement('button');

            button.type = 'button';
            button.className = 'enq-dp-day';
            button.textContent = String(day);
            button.dataset.date = iso;

            if (iso === today) button.classList.add('is-today');

            if (times.length) {
                button.classList.add('is-available');
                button.setAttribute('aria-label', formatDateHuman(iso) + ' – ' +
                    times.length + (times.length === 1
                        ? ' appointment available' : ' appointments available'));
                button.addEventListener('click', function () { selectDate(iso); });
            } else {
                button.classList.add('is-unavailable');
                button.disabled = true;
                button.setAttribute('aria-label', formatDateHuman(iso) + ' – no appointments');
            }

            button.setAttribute('aria-pressed', iso === selected ? 'true' : 'false');
            if (iso === selected) button.classList.add('is-selected');

            els.dpGrid.appendChild(button);
        }

        updateCalendarNav();
    }

    function selectDate(iso) {
        els.apptDate.value = iso;
        clearFieldError('apptDate');
        renderCalendar();
        updateTimeOptions();

        // keep keyboard focus on the chosen day after the grid re-renders
        const chosen = els.dpGrid.querySelector('[data-date="' + iso + '"]');
        if (chosen) chosen.focus({ preventScroll: true });
    }

    function moveMonth(delta) {
        if (!calendarMonth) return;

        const index = monthIndexOf(calendarMonth) + delta;
        calendarMonth = {
            year: Math.floor(index / 12),
            month: ((index % 12) + 12) % 12
        };
        renderCalendar();
    }

    function renderDatePicker() {
        const dates = availableDates();

        if (!dates.length) {
            showCalendarEmpty('There are no appointments available to book online right now.');
            return;
        }

        els.datePicker.classList.remove('is-empty');

        // drop a selection that is no longer bookable
        if (els.apptDate.value && !(slotsByDate[els.apptDate.value] || []).length) {
            els.apptDate.value = '';
        }

        if (!calendarMonth) {
            calendarMonth = monthFromIso(dates[0]);
        } else {
            const first = monthIndexOf(monthFromIso(dates[0]));
            const last = monthIndexOf(monthFromIso(dates[dates.length - 1]));
            if (monthIndexOf(calendarMonth) < first || monthIndexOf(calendarMonth) > last) {
                calendarMonth = monthFromIso(dates[0]);
            }
        }

        renderCalendar();
        updateTimeOptions();
    }

    function showCalendarEmpty(message) {
        calendarMonth = null;
        els.datePicker.classList.add('is-empty');
        els.dpMonth.textContent = 'Appointments';
        els.dpGrid.innerHTML = '';

        const note = document.createElement('p');
        note.className = 'enq-dp-empty';
        note.textContent = message;
        els.dpGrid.appendChild(note);

        els.dpPrev.disabled = true;
        els.dpNext.disabled = true;
        updateTimeOptions();
    }

    async function loadSlots() {
        if (!isConfigured()) return;

        setStatus('Checking available appointment times...', 'loading');

        const map = await requestSlots();

        if (!map) {
            showCalendarEmpty('We could not load appointment times just now. Please refresh the page or call us on ' +
                CONTACT_PHONE_DISPLAY + '.');
            setStatus('We could not load appointment times just now. Please refresh the page, or call us on ' +
                CONTACT_PHONE_DISPLAY + '.', 'warn');
            return;
        }

        slotsByDate = map;
        slotsLoaded = true;

        renderDatePicker();

        const dates = availableDates();
        if (!dates.length) {
            setStatus('There are no appointments available to book online at the moment. Please call us on ' +
                CONTACT_PHONE_DISPLAY + ' or email ' + CONTACT_EMAIL + '.', 'warn');
            return;
        }

        setStatus('Next available appointment: ' + formatDateHuman(dates[0]) +
            '. Choose a date to see times.', 'info');
    }

    els.dpPrev.addEventListener('click', function () { moveMonth(-1); });
    els.dpNext.addEventListener('click', function () { moveMonth(1); });

    els.dpGrid.addEventListener('keydown', function (event) {
        const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (keys.indexOf(event.key) === -1) return;

        const days = $$('.enq-dp-day:not(:disabled)', els.dpGrid);
        if (!days.length) return;

        const current = days.indexOf(document.activeElement);
        let next = current;

        if (event.key === 'Home') {
            next = 0;
        } else if (event.key === 'End') {
            next = days.length - 1;
        } else if (current === -1) {
            next = 0;
        } else if (event.key === 'ArrowLeft') {
            next = Math.max(0, current - 1);
        } else if (event.key === 'ArrowRight') {
            next = Math.min(days.length - 1, current + 1);
        } else if (event.key === 'ArrowUp') {
            next = Math.max(0, current - 7);
        } else if (event.key === 'ArrowDown') {
            next = Math.min(days.length - 1, current + 7);
        }

        event.preventDefault();
        days[next].focus();
    });

    els.apptTime.addEventListener('change', function () {
        clearFieldError('apptTime');
    });

    /* =====================================================================
       8. Collecting the answers
       ===================================================================== */

    function collect() {
        const ages = $$('select[name^="childAge"]', els.childAges).map(function (s) { return s.value; });
        const benefits = $$('input[name="benefits"]:checked').map(function (box) {
            return box === els.benefitOther ? 'Other: ' + els.otherBenefit.value.trim() : box.value;
        });
        const employment = $('input[name="employment"]:checked');
        const support = $('input[name="support"]:checked');

        return {
            fullName: form.elements.fullName.value.trim(),
            phone: form.elements.phone.value.trim(),
            email: form.elements.email.value.trim(),
            address: form.elements.address.value.trim(),
            postcode: form.elements.postcode.value.trim().toUpperCase(),
            childCount: form.elements.childCount.value,
            childAges: ages,
            employment: employment ? employment.value : '',
            benefits: benefits,
            support: support ? support.value : '',
            apptDate: els.apptDate.value,
            apptTime: els.apptTime.value,
            notes: form.elements.notes.value.trim()
        };
    }

    function buildSummary(data) {
        const lines = [
            'Childcare eligibility enquiry',
            'Parent/carer: ' + data.fullName,
            'Phone: ' + data.phone,
            'Email: ' + data.email,
            'Address: ' + data.address + ', ' + data.postcode,
            'Children: ' + data.childCount + (data.childAges.length ? ' (ages: ' + data.childAges.join(', ') + ')' : ''),
            'Employment: ' + data.employment,
            'Benefits: ' + (data.benefits.length ? data.benefits.join(', ') : 'Not specified'),
            'Help needed: ' + data.support
        ];

        if (data.notes) lines.push('Notes: ' + data.notes);

        return lines.join('\n');
    }

    function resolveBookingFields(data) {
        const responses = {};
        const mapping = CALCOM.bookingFields || {};

        // Tokens that are built from several answers rather than read directly
        const derived = {
            summary: buildSummary,
            childrenText: function (d) {
                if (!d.childCount) return '';
                return d.childCount + ' child' + (d.childCount === '1' ? '' : 'ren') +
                    (d.childAges.length ? ' (ages: ' + d.childAges.join(', ') + ')' : '');
            },
            benefitsText: function (d) {
                return d.benefits.length ? d.benefits.join(', ') : 'None selected';
            },
            consentText: function () {
                return 'Yes - parent has read and agreed to the privacy notice';
            }
        };

        Object.keys(mapping).forEach(function (slug) {
            const token = mapping[slug];
            const value = derived[token] ? derived[token](data) : data[token];
            const text = (value === undefined || value === null || String(value).trim() === '')
                ? 'Not provided'
                : String(value);
            responses[slug] = text.slice(0, 800);
        });

        return responses;
    }

    function bookingPayload(data) {
        const body = {
            start: data.apptTime,                       // already UTC ISO from the select value
            attendee: {
                name: data.fullName,
                email: data.email,
                phoneNumber: normalisePhone(data.phone),
                timeZone: CALCOM.timeZone,
                language: 'en'
            },
            metadata: {
                source: 'Website childcare enquiry form',
                fullName: data.fullName.slice(0, 120),
                phone: data.phone.slice(0, 40),
                email: data.email.slice(0, 120),
                address: data.address.slice(0, 300),
                postcode: data.postcode.slice(0, 12),
                children: String(data.childCount),
                childAges: data.childAges.join(', ').slice(0, 120),
                employment: data.employment.slice(0, 60),
                benefits: data.benefits.join(', ').slice(0, 480),
                supportNeeded: data.support.slice(0, 120)
            }
        };

        if (data.notes) body.metadata.notes = data.notes.slice(0, 480);
        if (CALCOM.eventTypeId) {
            body.eventTypeId = CALCOM.eventTypeId;
        } else {
            body.eventTypeSlug = CALCOM.eventTypeSlug;
            body.username = CALCOM.username;
        }
        if (CALCOM.locationType) body.location = { type: CALCOM.locationType };

        const responses = resolveBookingFields(data);
        if (Object.keys(responses).length) body.bookingFieldsResponses = responses;

        return body;
    }

    async function createBooking(data) {
        const send = async function (body) {
            const response = await fetch(API_BASE + '/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'cal-api-version': CALCOM.bookingsApiVersion
                },
                body: JSON.stringify(body)
            });
            const payload = await response.json().catch(function () { return null; });
            return { ok: response.ok, status: response.status, payload: payload };
        };

        let result = await send(bookingPayload(data));

        // Only if this Cal.com plan/version rejects booking questions outright do we
        // retry without them (the answers still reach us in the booking metadata).
        const reason = result.payload && result.payload.error
            ? (result.payload.error.message || '')
            : '';
        const fieldsUnsupported = !result.ok && result.status === 400 &&
            /unknown key|unrecognized key|unexpected key|not supported/i.test(reason) &&
            !/required/i.test(reason);

        if (fieldsUnsupported) {
            const retryBody = bookingPayload(data);
            delete retryBody.bookingFieldsResponses;
            const retry = await send(retryBody);
            if (retry.ok) return retry;
            if (retry.payload) result = retry;
        }

        return result;
    }

    /* =====================================================================
       9. Success screen
       ===================================================================== */

    function showConfirmation(data, booking) {
        const name = data.fullName.split(' ')[0];
        $('#successName').textContent = name ? ', ' + name : '';

        $('#successLead').textContent =
            'Your appointment request for ' + formatDateHuman(data.apptDate) + ' at ' +
            formatTimeHuman(data.apptTime) + ' has been received.';

        const details = [
            ['Reference', booking && booking.uid ? booking.uid : 'Sent by email'],
            ['Date', formatDateHuman(data.apptDate)],
            ['Time', formatTimeHuman(data.apptTime)],
            ['Location', '294 Edward Road, Birmingham, B5 7PH'],
            ['Enquiry', data.support]
        ];

        const list = $('#successDetail');
        list.innerHTML = '';
        details.forEach(function (row) {
            const dt = document.createElement('dt');
            dt.textContent = row[0];
            const dd = document.createElement('dd');
            dd.textContent = row[1];
            list.appendChild(dt);
            list.appendChild(dd);
        });

        form.hidden = true;
        els.success.hidden = false;
        els.success.focus({ preventScroll: true });
        els.success.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* =====================================================================
       10. Fallback: booking not switched on yet
       ===================================================================== */

    function enableEmailFallback() {
        els.bookingFields.hidden = true;
        els.bookingUnavailable.hidden = false;
        els.submitBtn.textContent = 'Send Enquiry by Email';

        if (window.console && console.warn) {
            console.warn('[Community Reform CIC] Cal.com is not configured yet - the enquiry form is using the ' +
                'email fallback. Add your Cal.com details in enquiry.js (see CALCOM-SETUP.md).');
        }
    }

    function sendByEmail(data) {
        const subject = 'Childcare enquiry - ' + data.fullName;
        const body = buildSummary(data) +
            '\n\n(Please reply to this email or call ' + CONTACT_PHONE_DISPLAY + ' to arrange your appointment.)';

        window.location.href = 'mailto:' + CONTACT_EMAIL +
            '?subject=' + encodeURIComponent(subject) +
            '&body=' + encodeURIComponent(body.slice(0, 1600));

        showMessage(
            'Your email app should now open with your enquiry ready to send. If it doesn\u2019t, please email ' +
            '<a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a> or call ' +
            '<a href="tel:07359725058">' + CONTACT_PHONE_DISPLAY + '</a>.',
            'success'
        );
    }

    /* =====================================================================
       11. Submit
       ===================================================================== */

    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        // Spam trap: real people never fill this in, and never submit instantly
        const honeypotFilled = form.elements.website && form.elements.website.value;
        if (honeypotFilled || Date.now() - pageLoadedAt < 1500) {
            return;
        }

        if (!validate()) return;

        const data = collect();

        if (!isConfigured()) {
            sendByEmail(data);
            return;
        }

        els.submitBtn.disabled = true;
        const originalLabel = els.submitBtn.textContent;
        els.submitBtn.textContent = 'Booking your appointment...';

        try {
            const result = await createBooking(data);

            if (result.ok) {
                const booking = result.payload && result.payload.data ? result.payload.data : null;
                showConfirmation(data, booking);
                return;
            }

            const message = result.payload && result.payload.error
                ? (result.payload.error.message || '')
                : '';

            if (window.console && console.error) {
                console.error('[Community Reform CIC] Cal.com booking failed (' + result.status + '):',
                    message || result.payload);
            }

            // This email address already has an appointment booked
            if (/maximum number of active bookings|active bookings has been reached|reschedule your existing booking/i.test(message)) {
                showMessage('This email address already has an appointment booked with us. ' +
                    'You can move it to a different time using the link in your confirmation email \u2013 ' +
                    'or call us on <a href="tel:07359725058">' + CONTACT_PHONE_DISPLAY + '</a> and we will help.',
                    'error');
                return;
            }

            // Cal.com would not accept the phone number
            if (/invalid_number|attendeePhoneNumber/i.test(message)) {
                showMessage('We could not use that phone number. Please check it and try again \u2013 ' +
                    'or call us on <a href="tel:07359725058">' + CONTACT_PHONE_DISPLAY + '</a>.', 'error');
                setFieldError('phone', 'Please check this phone number.');
                if (form.elements.phone) form.elements.phone.focus({ preventScroll: true });
                return;
            }

            // Cal.com would not accept the email address
            if (/email_validation_error|email/i.test(message) && /responses/i.test(message)) {
                showMessage('We could not use that email address. Please check it and try again \u2013 ' +
                    'or call us on <a href="tel:07359725058">' + CONTACT_PHONE_DISPLAY + '</a>.', 'error');
                setFieldError('email', 'Please check this email address.');
                if (form.elements.email) form.elements.email.focus({ preventScroll: true });
                return;
            }

            // Missing/invalid answer for one of the booking questions - our set-up issue, not theirs
            if (/missing required booking field/i.test(message)) {
                showMessage('We could not send your answers through automatically just now. ' +
                    'Please call us on <a href="tel:07359725058">' + CONTACT_PHONE_DISPLAY + '</a> or email ' +
                    '<a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a> and we will book you in.',
                    'error');
                return;
            }

            // Slot taken while the form was open, or the time is no longer bookable
            if (result.status === 400 || result.status === 409) {
                if (/slot|availab|conflict|busy|already/i.test(message)) {
                    showMessage('Sorry - that appointment time was booked by someone else just now. ' +
                        'Please choose another time from the list.', 'error');
                    clearFieldError('apptTime');
                    els.apptTime.value = '';
                    slotsByDate = (await requestSlots()) || {};
                    renderDatePicker();
                    return;
                }

                showMessage('We could not book that appointment automatically. Please call us on ' +
                    '<a href="tel:07359725058">' + CONTACT_PHONE_DISPLAY + '</a> or email ' +
                    '<a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a> and we will sort it out for you.',
                    'error');
                return;
            }

            throw new Error(message || 'Booking failed with status ' + result.status);
        } catch (error) {
            showMessage('Something went wrong while booking your appointment. Your details have not been sent. ' +
                'Please try again, or call us on <a href="tel:07359725058">' + CONTACT_PHONE_DISPLAY + '</a>.',
                'error');
        } finally {
            els.submitBtn.disabled = false;
            els.submitBtn.textContent = originalLabel;
        }
    });

    /* =====================================================================
       12. Start
       ===================================================================== */

    if (isConfigured()) {
        loadSlots();
    } else {
        enableEmailFallback();
    }
})();
