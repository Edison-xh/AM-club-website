const membershipStorageKey = 'amClubMembership';
const eventRegistrationStorageKey = 'amClubEventRegistrations';
const eventDataPath = 'data/events.json';
let eventDetailsById = new Map();

async function loadEventDetails() {
    try {
        const response = await fetch(eventDataPath);

        if (!response.ok) throw new Error('Unable to load event details.');

        const events = await response.json();
        eventDetailsById = new Map(events.map(event => [String(event.id), event]));
    } catch (error) {
        console.error('Unable to load event details for registrations.', error);
    }
}

function formatRegistrationDate(dateTime) {
    return new Date(dateTime).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatRegistrationTime(dateTime) {
    return new Date(dateTime).toLocaleTimeString('en-MY', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

function validateForm(form, statusMessage) {
    const fields = [...form.querySelectorAll('input, select, textarea')];
    const invalidFields = fields.filter(field => !field.checkValidity());

    fields.forEach(field => {
        const isInvalid = !field.checkValidity();
        field.classList.toggle('input-is-invalid', isInvalid);
        field.toggleAttribute('aria-invalid', isInvalid);
    });

    if (invalidFields.length === 0) return true;

    statusMessage.className = 'form-message error';
    statusMessage.textContent = getValidationMessage(invalidFields[0]);
    invalidFields[0].focus();
    return false;
}

function getValidationMessage(field) {
    const label = field.closest('.form-field')?.querySelector('label')?.textContent.replace('*', '').trim() || 'This field';

    if (field.validity.valueMissing) return `${label} is required.`;
    if (field.name === 'name' && field.validity.tooShort) return 'Your full name must be at least 2 characters.';
    if (field.validity.typeMismatch && field.type === 'email') return 'Enter a valid email address, for example name@example.com.';

    return `Please enter a valid ${label.toLowerCase()}.`;
}

function clearFieldError(event) {
    if (!event.target.matches('input, select, textarea')) return;

    const statusMessage = event.currentTarget.querySelector('.form-message');

    if (event.target.checkValidity()) {
        event.target.classList.remove('input-is-invalid');
        event.target.removeAttribute('aria-invalid');

        if (statusMessage) {
            statusMessage.className = 'form-message';
            statusMessage.textContent = '';
        }
    } else if (event.target.classList.contains('input-is-invalid') && statusMessage) {
        statusMessage.className = 'form-message error';
        statusMessage.textContent = getValidationMessage(event.target);
    }
}

function setupBootstrapTooltips() {
    if (!window.bootstrap?.Tooltip) return;

    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(element => {
        bootstrap.Tooltip.getOrCreateInstance(element);
    });
}

function setupContactForm() {
    const form = document.querySelector('#contact-form');
    const statusMessage = document.querySelector('#contact-form-message');
    const successModalElement = document.querySelector('#contact-success-modal');

    if (!form || !statusMessage || !successModalElement) return;

    form.addEventListener('submit', event => {
        event.preventDefault();

        if (!validateForm(form, statusMessage)) return;

        form.reset();
        statusMessage.className = 'form-message';
        statusMessage.textContent = '';

        if (window.bootstrap?.Modal) {
            bootstrap.Modal.getOrCreateInstance(successModalElement).show();
        } else {
            statusMessage.className = 'form-message success';
            statusMessage.textContent = 'Message submitted! We’ll get back to you soon.';
        }
    });

    form.addEventListener('input', clearFieldError);
    form.addEventListener('change', clearFieldError);
}

function getSelectedLabel(selectElement) {
    return selectElement.options[selectElement.selectedIndex].text;
}

function getMembershipFromForm(form) {
    const programmeField = form.elements.programme;
    const interestField = form.elements.interest;

    return {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        programme: programmeField.value,
        programmeLabel: getSelectedLabel(programmeField),
        interest: interestField.value,
        interestLabel: getSelectedLabel(interestField)
    };
}

function restoreStorageValue(key, value) {
    if (value === null) {
        localStorage.removeItem(key);
    } else {
        localStorage.setItem(key, value);
    }
}

function saveMembershipUpdate(membership, migratedRegistrations, statusMessage) {
    let previousValues = null;

    try {
        // localStorage has no transactions, so keep a snapshot that can be restored if either write fails.
        previousValues = {
            membership: localStorage.getItem(membershipStorageKey),
            registrations: localStorage.getItem(eventRegistrationStorageKey)
        };
        localStorage.setItem(membershipStorageKey, JSON.stringify(membership));

        if (migratedRegistrations !== null) {
            localStorage.setItem(eventRegistrationStorageKey, JSON.stringify(migratedRegistrations));
        }

        return true;
    } catch (error) {
        console.error('Unable to save membership information.', error);

        if (previousValues) {
            try {
                restoreStorageValue(membershipStorageKey, previousValues.membership);
                restoreStorageValue(eventRegistrationStorageKey, previousValues.registrations);
            } catch (rollbackError) {
                console.error('Unable to restore the previous membership information.', rollbackError);
            }
        }

        statusMessage.className = 'form-message error';
        statusMessage.textContent = 'Your browser could not save this information.';
        return false;
    }
}

function loadMembership() {
    try {
        const storedMembership = localStorage.getItem(membershipStorageKey);

        if (!storedMembership) return null;

        const membership = JSON.parse(storedMembership);
        const requiredValues = ['name', 'email', 'programme', 'programmeLabel', 'interest', 'interestLabel'];

        return requiredValues.every(key => typeof membership[key] === 'string' && membership[key])
            ? membership
            : null;
    } catch (error) {
        console.error('Unable to read saved membership information.', error);
        return null;
    }
}

function getMemberEventRegistrations(email) {
    try {
        const registrations = JSON.parse(localStorage.getItem(eventRegistrationStorageKey));

        if (!Array.isArray(registrations)) return [];

        return registrations.filter(registration =>
            String(registration.email || '').toLowerCase() === email.toLowerCase());
    } catch (error) {
        console.error('Unable to read saved event registrations.', error);
        return [];
    }
}

function prepareMigratedEventRegistrations(oldMembership, updatedMembership) {
    if (!oldMembership || oldMembership.email.toLowerCase() === updatedMembership.email.toLowerCase()) {
        return null;
    }

    try {
        const registrations = JSON.parse(localStorage.getItem(eventRegistrationStorageKey));

        if (!Array.isArray(registrations)) return null;

        const oldEmail = oldMembership.email.toLowerCase();
        const newEmail = updatedMembership.email.toLowerCase();
        const registeredEventIdsForNewEmail = new Set(
            registrations
                .filter(registration => String(registration.email || '').toLowerCase() === newEmail)
                .map(registration => String(registration.eventId))
        );

        const migratedRegistrations = registrations.reduce((result, registration) => {
            const isOldMembershipRegistration = String(registration.email || '').toLowerCase() === oldEmail;

            if (!isOldMembershipRegistration) {
                result.push(registration);
                return result;
            }

            if (registeredEventIdsForNewEmail.has(String(registration.eventId))) {
                return result;
            }

            registeredEventIdsForNewEmail.add(String(registration.eventId));
            result.push({
                ...registration,
                name: updatedMembership.name,
                email: updatedMembership.email
            });
            return result;
        }, []);

        // Return the new list without saving it; both storage keys are committed together later.
        return migratedRegistrations;
    } catch (error) {
        console.error('Unable to prepare event registrations after changing the membership email.', error);
        return undefined;
    }
}

function removeMembershipData(membership) {
    let previousValues = null;

    try {
        previousValues = {
            membership: localStorage.getItem(membershipStorageKey),
            registrations: localStorage.getItem(eventRegistrationStorageKey)
        };

        const registrations = previousValues.registrations === null
            ? []
            : JSON.parse(previousValues.registrations);

        if (!Array.isArray(registrations)) {
            throw new Error('Saved event registrations are invalid.');
        }

        const membershipEmail = membership.email.toLowerCase();
        // Remove this member's registrations while preserving records saved under other emails.
        const remainingRegistrations = registrations.filter(registration =>
            String(registration.email || '').toLowerCase() !== membershipEmail);

        if (remainingRegistrations.length !== registrations.length) {
            if (remainingRegistrations.length === 0) {
                localStorage.removeItem(eventRegistrationStorageKey);
            } else {
                localStorage.setItem(eventRegistrationStorageKey, JSON.stringify(remainingRegistrations));
            }
        }

        localStorage.removeItem(membershipStorageKey);
        return true;
    } catch (error) {
        console.error('Unable to remove membership information.', error);

        if (previousValues) {
            try {
                // Restore both values because localStorage cannot delete multiple keys as one transaction.
                restoreStorageValue(membershipStorageKey, previousValues.membership);
                restoreStorageValue(eventRegistrationStorageKey, previousValues.registrations);
            } catch (rollbackError) {
                console.error('Unable to restore membership information after deletion failed.', rollbackError);
            }
        }

        return false;
    }
}

function updateMemberRegistrationCount(membership) {
    const count = getMemberEventRegistrations(membership.email).length;
    const countElement = document.querySelector('#membership-registration-count');

    if (countElement) {
        countElement.textContent = String(count);
    }
}

function setupMemberRegistrations() {
    const button = document.querySelector('#my-registrations-button');
    const registrationsList = document.querySelector('#member-registrations-list');

    if (!button || !registrationsList) return;

    button.addEventListener('click', async () => {
        const membership = loadMembership();
        const registrations = membership ? getMemberEventRegistrations(membership.email) : [];

        registrationsList.replaceChildren();

        if (registrations.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'member-registrations-empty';
            emptyMessage.textContent = 'You have not registered for any events yet.';
            registrationsList.append(emptyMessage);
            return;
        }

        const loadingMessage = document.createElement('p');
        loadingMessage.className = 'member-registrations-empty';
        loadingMessage.textContent = 'Loading registration details...';
        registrationsList.append(loadingMessage);

        // Wait for events.json before deciding whether each registration is upcoming or completed.
        await eventDetailsLoadPromise;
        registrationsList.replaceChildren();

        const currentDateTime = new Date();

        registrations
            .sort((first, second) => new Date(second.registeredAt) - new Date(first.registeredAt))
            .forEach(registration => {
                const item = document.createElement('article');
                const title = document.createElement('h3');
                const status = document.createElement('span');
                const details = document.createElement('dl');
                const meta = document.createElement('p');
                const event = eventDetailsById.get(String(registration.eventId));
                const eventStartDate = event ? new Date(event.start) : null;
                const eventEndDate = event ? new Date(event.end) : null;
                const eventIsAvailable = Boolean(event &&
                    !Number.isNaN(eventStartDate.getTime()) &&
                    !Number.isNaN(eventEndDate.getTime()) &&
                    eventStartDate <= eventEndDate &&
                    typeof event.venue === 'string' && event.venue.trim());
                // Missing events and invalid dates must not be presented as successfully completed events.
                const eventStatus = !eventIsAvailable
                    ? 'Unavailable'
                    : eventEndDate >= currentDateTime ? 'Upcoming' : 'Completed';
                const detailRows = eventIsAvailable
                    ? [
                        ['Date', formatRegistrationDate(event.start)],
                        ['Time', `${formatRegistrationTime(event.start)} – ${formatRegistrationTime(event.end)}`],
                        ['Venue', event.venue]
                    ]
                    : [['Event details', 'No longer available']];

                item.className = 'member-registration-item';
                title.className = 'member-registration-title';
                status.className = `member-registration-status member-registration-status--${eventStatus.toLowerCase()}`;
                details.className = 'member-registration-details';
                meta.className = 'member-registration-meta';
                title.textContent = registration.eventTitle;
                status.textContent = eventStatus;
                meta.textContent = `Registered on ${formatRegistrationDate(registration.registeredAt)} · ${registration.email}`;

                detailRows.forEach(([label, value]) => {
                    const detailLabel = document.createElement('dt');
                    const detailValue = document.createElement('dd');

                    detailLabel.textContent = label;
                    detailValue.textContent = value;
                    details.append(detailLabel, detailValue);
                });

                item.append(title, status, details, meta);
                registrationsList.append(item);
            });
    });
}

function setupMembershipForm() {
    const form = document.querySelector('#join-form');
    const statusMessage = document.querySelector('#join-form-message');
    const summary = document.querySelector('#membership-summary');
    const title = document.querySelector('#join-panel-title');
    const description = document.querySelector('#join-panel-description');
    const submitButtonLabel = document.querySelector('#join-submit-button span');
    const editButton = document.querySelector('#edit-membership-button');
    const leaveButton = document.querySelector('#confirm-leave-club-button');
    const leaveModalElement = document.querySelector('#leave-club-modal');
    const leaveMessage = document.querySelector('#leave-club-message');

    if (!form || !statusMessage || !summary || !title || !description ||
        !submitButtonLabel || !editButton || !leaveButton || !leaveModalElement || !leaveMessage) return;

    function displayMembership(membership) {
        document.querySelector('#membership-welcome').textContent = `Welcome, ${membership.name}!`;
        document.querySelector('#membership-email').textContent = membership.email;
        document.querySelector('#membership-programme').textContent = membership.programmeLabel;
        document.querySelector('#membership-interest').textContent = membership.interestLabel;
        updateMemberRegistrationCount(membership);

        title.textContent = 'Your Club Membership';
        description.hidden = true;
        form.hidden = true;
        summary.hidden = false;
    }

    function displayMembershipForm(membership = null) {
        form.reset();

        if (membership) {
            form.elements.name.value = membership.name;
            form.elements.email.value = membership.email;
            form.elements.programme.value = membership.programme;
            form.elements.interest.value = membership.interest;
        }

        title.textContent = membership ? 'Edit Your Details' : 'Join Our Club';
        description.textContent = membership
            ? 'Update your saved club information below.'
            : 'Fill in the form below to become a part of our creative community!';
        description.hidden = false;
        submitButtonLabel.textContent = membership ? 'Save Details' : 'Join Us Now';
        statusMessage.className = 'form-message';
        statusMessage.textContent = '';
        summary.hidden = true;
        form.hidden = false;
    }

    form.addEventListener('submit', event => {
        event.preventDefault();

        if (!validateForm(form, statusMessage)) return;

        const membership = getMembershipFromForm(form);

        const previousMembership = loadMembership();

        const migratedRegistrations = prepareMigratedEventRegistrations(previousMembership, membership);

        if (migratedRegistrations === undefined) {
            statusMessage.className = 'form-message error';
            statusMessage.textContent = 'Your event registrations could not be updated. Please try again.';
            return;
        }

        if (saveMembershipUpdate(membership, migratedRegistrations, statusMessage)) {
            displayMembership(membership);
        }
    });

    form.addEventListener('input', clearFieldError);
    form.addEventListener('change', clearFieldError);

    editButton.addEventListener('click', () => {
        displayMembershipForm(loadMembership());
    });

    leaveModalElement.addEventListener('show.bs.modal', () => {
        leaveMessage.className = 'form-message';
        leaveMessage.textContent = '';
    });

    leaveButton.addEventListener('click', () => {
        const membership = loadMembership();

        if (!membership || !removeMembershipData(membership)) {
            leaveMessage.className = 'form-message error';
            leaveMessage.textContent = 'Your saved membership data could not be removed. Please try again.';
            return;
        }

        displayMembershipForm();

        if (window.bootstrap?.Modal) {
            bootstrap.Modal.getOrCreateInstance(leaveModalElement).hide();
        }
    });

    const savedMembership = loadMembership();

    if (savedMembership) {
        displayMembership(savedMembership);
    }
}

setupContactForm();
setupMembershipForm();
setupMemberRegistrations();
setupBootstrapTooltips();

// Reuse one request so every registration view waits for the same event-data load.
const eventDetailsLoadPromise = loadEventDetails();
