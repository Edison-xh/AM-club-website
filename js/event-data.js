// Shared event helpers used by the Events and Event Archive pages.
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatEventDate(dateTime) {
    return new Date(dateTime).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatEventTimeRange(startDateTime, endDateTime) {
    const timeOptions = {
        hour: 'numeric',
        minute: '2-digit'
    };
    const startTime = new Date(startDateTime).toLocaleTimeString('en-MY', timeOptions);
    const endTime = new Date(endDateTime).toLocaleTimeString('en-MY', timeOptions);

    return `${startTime} - ${endTime}`;
}

function separateEvents(events) {
    const currentDateTime = new Date();

    const upcomingEvents = events
        .filter(event => new Date(event.end) >= currentDateTime)
        .sort((firstEvent, secondEvent) => new Date(firstEvent.start) - new Date(secondEvent.start));
    const pastEvents = events
        .filter(event => new Date(event.end) < currentDateTime)
        .sort((firstEvent, secondEvent) => new Date(secondEvent.start) - new Date(firstEvent.start));

    return {
        upcoming: upcomingEvents,
        past: pastEvents
    };
}

function createCategoryTag(category, extraClass = '') {
    if (!category) {
        return '';
    }

    const categoryClass = category
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    return `<span class="event-category-tag event-category--${escapeHtml(categoryClass)} ${escapeHtml(extraClass)}">${escapeHtml(category)}</span>`;
}

const eventRegistrationStorageKey = 'amClubEventRegistrations';
const membershipStorageKey = 'amClubMembership';

function getSavedMembership() {
    try {
        const membership = JSON.parse(localStorage.getItem(membershipStorageKey));

        return membership?.name && membership?.email ? membership : null;
    } catch (error) {
        console.error('Unable to read saved membership information.', error);
        return null;
    }
}

function getEventRegistrations() {
    try {
        const registrations = JSON.parse(localStorage.getItem(eventRegistrationStorageKey));

        return Array.isArray(registrations) ? registrations : [];
    } catch (error) {
        console.error('Unable to read saved event registrations.', error);
        return [];
    }
}

function isEventRegistered(eventId, email) {
    return getEventRegistrations().some(registration =>
        String(registration.eventId) === String(eventId) &&
        String(registration.email || '').toLowerCase() === email.toLowerCase());
}

function setEventRegistrationTarget(button, event) {
    if (!button) return;

    button.dataset.eventId = event.id;
    button.dataset.eventTitle = event.title;
    updateRegistrationButton(button);
}

function updateRegistrationButton(button) {
    const membership = getSavedMembership();
    const eventId = button.dataset.eventId;
    const isRegistered = membership && eventId && isEventRegistered(eventId, membership.email);

    button.disabled = false;
    button.classList.toggle('is-registered', Boolean(isRegistered));
    button.setAttribute('aria-label', isRegistered
        ? `You are registered for ${button.dataset.eventTitle}`
        : `Register for ${button.dataset.eventTitle}`);
    button.innerHTML = isRegistered
        ? 'Registered <i class="bi bi-check-lg" aria-hidden="true"></i>'
        : 'Register Now <i class="bi bi-arrow-right" aria-hidden="true"></i>';
}

function refreshRegistrationButtons() {
    document.querySelectorAll('[data-event-register][data-event-id]').forEach(updateRegistrationButton);
}

function showEventDetailsModal(event) {
    const modalElement = document.querySelector('#event-details-modal');

    if (!modalElement) return;

    document.querySelector('#event-details-title').textContent = event.title;
    document.querySelector('#event-details-image').src = event.image;
    document.querySelector('#event-details-image').alt = event.imageAlt;
    document.querySelector('#event-details-description').textContent = event.description;
    document.querySelector('#event-details-meta').innerHTML = `
        <span><i class="bi bi-calendar-day" aria-hidden="true"></i>${escapeHtml(formatEventDate(event.start))}</span>
        <span><i class="bi bi-clock" aria-hidden="true"></i>${escapeHtml(formatEventTimeRange(event.start, event.end))}</span>
        <span><i class="bi bi-geo-alt" aria-hidden="true"></i>${escapeHtml(event.venue)}</span>
        <span><i class="bi bi-tag" aria-hidden="true"></i>${escapeHtml(event.category)}</span>
    `;
    setEventRegistrationTarget(document.querySelector('#event-details-register-link'), event);

    if (window.bootstrap?.Modal) {
        bootstrap.Modal.getOrCreateInstance(modalElement).show();
    }
}

function setupEventRegistrationModal() {
    const registrationModalElement = document.querySelector('#event-registration-modal');
    const successModalElement = document.querySelector('#event-registration-success-modal');
    const form = document.querySelector('#event-registration-form');
    const message = document.querySelector('#event-registration-message');

    if (!registrationModalElement || !successModalElement || !form || !message) return;

    function clearRegistrationValidation() {
        form.querySelectorAll('input[required]').forEach(field => {
            field.classList.remove('input-is-invalid');
            field.removeAttribute('aria-invalid');
        });
        message.textContent = '';
        message.className = 'event-registration-message';
    }

    function getRegistrationFieldError(field) {
        if (field.validity.valueMissing) {
            return field.name === 'email'
                ? 'Please enter your email address.'
                : 'Please enter your full name.';
        }

        if (field.name === 'name' && field.validity.tooShort) {
            return 'Your full name must be at least 8 characters.';
        }

        if (field.validity.typeMismatch && field.name === 'email') {
            return 'Enter a valid email address, for example name@example.com.';
        }

        return 'Please correct the highlighted field.';
    }

    function showRegistrationToast() {
        const toastElement = document.querySelector('#event-registration-toast');

        if (!toastElement) return;

        document.querySelector('#event-registration-toast-message').textContent =
            'You are already registered for this event.';

        if (window.bootstrap?.Toast) {
            bootstrap.Toast.getOrCreateInstance(toastElement).show();
        }
    }

    function showRegistrationModal(button) {
        const membership = getSavedMembership();
        const eventId = button.dataset.eventId;
        const eventTitle = button.dataset.eventTitle;
        const nameField = form.elements.name;
        const emailField = form.elements.email;

        form.reset();
        clearRegistrationValidation();
        form.elements.eventId.value = eventId;
        form.dataset.eventTitle = eventTitle;
        document.querySelector('#event-registration-event-name').textContent = eventTitle;
        nameField.value = membership?.name || '';
        emailField.value = membership?.email || '';
        if (window.bootstrap?.Modal) {
            const detailsModalElement = document.querySelector('#event-details-modal');
            const detailsModal = detailsModalElement ? bootstrap.Modal.getInstance(detailsModalElement) : null;
            const registrationModal = bootstrap.Modal.getOrCreateInstance(registrationModalElement);

            if (detailsModal) {
                detailsModalElement.addEventListener('hidden.bs.modal', () => registrationModal.show(), { once: true });
                detailsModal.hide();
            } else {
                registrationModal.show();
            }
        }
    }

    function showRegistrationSuccess() {
        if (!window.bootstrap?.Modal) return;

        const registrationModal = bootstrap.Modal.getInstance(registrationModalElement);
        const successModal = bootstrap.Modal.getOrCreateInstance(successModalElement);

        if (registrationModal) {
            registrationModalElement.addEventListener('hidden.bs.modal', () => successModal.show(), { once: true });
            registrationModal.hide();
        } else {
            successModal.show();
        }
    }

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-event-register]');

        if (!button || !button.dataset.eventId) return;

        const membership = getSavedMembership();

        if (membership && isEventRegistered(button.dataset.eventId, membership.email)) {
            showRegistrationToast();
            return;
        }

        showRegistrationModal(button);
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        const fields = [...form.querySelectorAll('input[required]')];
        const invalidFields = fields.filter(field => !field.checkValidity());
        const nameField = form.elements.name;
        const emailField = form.elements.email;

        if (!nameField.value.trim() && !emailField.value.trim()) {
            fields.forEach(field => {
                field.classList.add('input-is-invalid');
                field.setAttribute('aria-invalid', 'true');
            });
            message.className = 'event-registration-message error';
            message.textContent = 'Please enter your full name and email address.';
            nameField.focus();
            return;
        }


        
        fields.forEach(field => {
            const isInvalid = !field.checkValidity();
            field.classList.toggle('input-is-invalid', isInvalid);
            field.toggleAttribute('aria-invalid', isInvalid);
        });

        if (invalidFields.length > 0) {
            message.className = 'event-registration-message error';
            message.textContent = getRegistrationFieldError(invalidFields[0]);
            invalidFields[0].focus();
            return;
        }

        const eventId = form.elements.eventId.value;
        const eventTitle = form.dataset.eventTitle;
        const name = form.elements.name.value.trim();
        const email = form.elements.email.value.trim();

        // Keep the submitted name readable and require at least eight characters.
        if (name.length < 8) {
            nameField.classList.add('input-is-invalid');
            nameField.setAttribute('aria-invalid', 'true');
            message.className = 'event-registration-message error';
            message.textContent = 'Your full name must be at least 8 characters.';
            nameField.focus();
            return;
        }

        if (isEventRegistered(eventId, email)) {
            message.className = 'event-registration-message error';
            message.textContent = 'This email is already registered for this event.';
            return;
        }

        const registrations = getEventRegistrations();
        registrations.push({
            eventId,
            eventTitle,
            name,
            email,
            registeredAt: new Date().toISOString()
        });

        try {
            localStorage.setItem(eventRegistrationStorageKey, JSON.stringify(registrations));
            refreshRegistrationButtons();
            showRegistrationSuccess();
        } catch (error) {
            console.error('Unable to save event registration.', error);
            message.className = 'event-registration-message error';
            message.textContent = 'Your browser could not save this registration.';
        }
    });

    form.addEventListener('input', event => {
        if (!event.target.matches('input')) return;

        if (event.target.checkValidity()) {
            event.target.classList.remove('input-is-invalid');
            event.target.removeAttribute('aria-invalid');
            message.textContent = '';
            message.className = 'event-registration-message';
        } else if (event.target.classList.contains('input-is-invalid')) {
            message.className = 'event-registration-message error';
            message.textContent = getRegistrationFieldError(event.target);
        }
    });

    registrationModalElement.addEventListener('hidden.bs.modal', clearRegistrationValidation);
}

setupEventRegistrationModal();

function createEventCard(event) {
    return `
        <article class="event-card" data-event-id="${escapeHtml(event.id)}">
            <div class="event-card-image-wrapper">
                <img class="event-card-image" src="${escapeHtml(event.image)}" alt="${escapeHtml(event.imageAlt)}">
                ${createCategoryTag(event.category)}
            </div>

            <div class="event-card-content">
                <h3 class="event-card-title">${escapeHtml(event.title)}</h3>
                <p class="event-card-description">${escapeHtml(event.description)}</p>

                <div class="event-card-details">
                    <span><i class="bi bi-calendar-day" aria-hidden="true"></i>${escapeHtml(formatEventDate(event.start))}</span>
                    <span><i class="bi bi-clock" aria-hidden="true"></i>${escapeHtml(formatEventTimeRange(event.start, event.end))}</span>
                    <span><i class="bi bi-geo-alt" aria-hidden="true"></i>${escapeHtml(event.venue)}</span>
                </div>

                <button class="event-card-details-button" type="button" data-event-details="${escapeHtml(event.id)}">
                    View Details <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
                </button>
            </div>
        </article>
    `;
}
