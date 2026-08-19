// Return only the short month name and year e.g sep 2026
function formatEventMonth(dateTime) {
    const date = new Date(dateTime);

    return date.toLocaleString('en-MY', {
        month: 'short',
        year: 'numeric'
    }).toUpperCase();
}

//Display the first upcoming event in the top section.
function renderFeaturedEvent(event) {
    const featuredDetails = document.querySelector('#featured-event-details');
    const registerButton = document.querySelector('#featured-event-register-link');
    const featuredImage = document.querySelector('#featured-event-image');

    if (featuredImage) {
        featuredImage.src = event.image;
        featuredImage.alt = event.imageAlt;
    }

    featuredDetails.innerHTML = `
        <div class="event-highlight-date">
            <span class="event-highlight-day">
                ${new Date(event.start).getDate()}
            </span>
            <span class="event-highlight-month">
                ${formatEventMonth(event.start)}
            </span>
        </div>

        <div class="event-highlight-information">
            <h2 class="event-highlight-event-title">${escapeHtml(event.title)}</h2>
            <p class="event-highlight-description">${escapeHtml(event.description)}</p>
            <p class="event-highlight-meta">
                ${escapeHtml(formatEventTimeRange(event.start, event.end))} &bull; ${escapeHtml(event.venue)}
            </p>
        </div>
    `;

    setEventRegistrationTarget(registerButton, event);
    document.querySelector('[data-event-details="featured-event"]').dataset.eventId = event.id;
}

// Generate HTML for one past event gallery item
function createPastEventCard(event) {
    return `
        <article class="past-event-gallery-card">
            <div class="past-event-gallery-image-wrapper">
                <img
                    class="past-event-gallery-image"
                    src="${escapeHtml(event.image)}"
                    alt="${escapeHtml(event.imageAlt)}">
                ${createCategoryTag(event.category)}
            </div>

            <div class="past-event-gallery-content">
                <h3 class="past-event-gallery-title">${escapeHtml(event.title)}</h3>

                <p class="past-event-gallery-meta">
                    <span class="past-event-gallery-date-location">${escapeHtml(formatEventDate(event.start).toUpperCase())}</span>
                    <span aria-hidden="true"> | </span>
                    <span class="past-event-gallery-date-location">${escapeHtml(event.venue)}</span>
                </p>

                <p class="past-event-gallery-description">${escapeHtml(event.description)}</p>
            </div>
        </article>
    `;
}

// Create category filter button
function renderEventFilters(events) {
    const categories = ['all', ...new Set(events.map(event => event.category).filter(Boolean))];
    const filterList = document.querySelector('#event-filter-list');

    filterList.innerHTML = categories.map(category => `
        <button class="event-filter-button${category === 'all' ? ' is-active' : ''}"
            type="button" data-event-filter="${escapeHtml(category)}">
            ${escapeHtml(category === 'all' ? 'All events' : category)}
        </button>
    `).join('');
}

function setupEventInteractions(upcomingEvents) {
    const eventById = new Map(upcomingEvents.map(event => [String(event.id), event]));
    const featuredEvent = upcomingEvents[0];
    const resultsCount = document.querySelector('#event-results-count');
    const searchInput = document.querySelector('#event-search');
    const upcomingList = document.querySelector('#upcoming-events-list');
    function updateResults() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const activeFilter = document.querySelector('.event-filter-button.is-active')?.dataset.eventFilter || 'all';
        const matchingEvents = upcomingEvents.filter(event => {
            const matchesCategory = activeFilter === 'all' || event.category === activeFilter;
            const searchableText = event.title.toLowerCase();
            return matchesCategory && searchableText.includes(searchTerm);
        });
        // The homepage is a preview, so show only the first four matches from the full upcoming list.
        const displayedEvents = matchingEvents.slice(0, 4);

        upcomingList.innerHTML = displayedEvents.length > 0
            ? displayedEvents.map(createEventCard).join('')
            : '<p class="event-empty-message">No events match your search. Try another keyword or category.</p>';
        resultsCount.textContent = `${displayedEvents.length} event${displayedEvents.length === 1 ? '' : 's'} shown`;
    }

    // Build categories from every upcoming event so each filter can provide its own four-card preview.
    renderEventFilters(upcomingEvents);
    updateResults();

    if (window.jQuery) {
        const $ = window.jQuery;

        $(searchInput).on('input', updateResults);
        $(document).on('click', '[data-event-filter]', function () {
            $('.event-filter-button').removeClass('is-active');
            $(this).addClass('is-active');
            updateResults();
        });
        $(document).on('click', '[data-event-details]', function () {
            const eventId = this.dataset.eventId || this.getAttribute('data-event-details');
            const event = eventId === 'featured-event' ? featuredEvent : eventById.get(String(eventId));

            if (event) showEventDetailsModal(event);
        });
    } else {
        searchInput.addEventListener('input', updateResults);
        document.addEventListener('click', event => {
            const filterButton = event.target.closest('[data-event-filter]');
            const detailsButton = event.target.closest('[data-event-details]');

            if (filterButton) {
                document.querySelectorAll('.event-filter-button').forEach(button => button.classList.remove('is-active'));
                filterButton.classList.add('is-active');
                updateResults();
            }

            if (detailsButton) {
                const eventId = detailsButton.dataset.eventId || detailsButton.getAttribute('data-event-details');
                const selectedEvent = eventId === 'featured-event' ? featuredEvent : eventById.get(String(eventId));

                if (selectedEvent) showEventDetailsModal(selectedEvent);
            }
        });
    }
}

// Display erorr message when the event data cannot be loaded
function showEventError() {
    document.querySelector('#featured-event-details').textContent =
        'Featured event could not be loaded.';

    document.querySelector('#upcoming-events-list').textContent =
        'Upcoming events could not be loaded.';

    document.querySelector('#past-events-list').textContent =
        'Past events could not be loaded.';
}

function showNoUpcomingEvents() {
    const featuredDetails = document.querySelector('#featured-event-details');
    const featuredImage = document.querySelector('#featured-event-image');

    featuredDetails.innerHTML = '<p class="event-empty-message">There are no upcoming events at the moment. Please check back soon.</p>';
    document.querySelector('.event-highlight-actions').hidden = true;
    if (featuredImage) {
        featuredImage.removeAttribute('src');
        featuredImage.alt = '';
        featuredImage.hidden = true;
    }
    document.querySelector('#event-filter-list').replaceChildren();
    document.querySelector('.events-toolbar').hidden = true;
    document.querySelector('#event-results-count').textContent = '0 events found';
    document.querySelector('#upcoming-events-list').innerHTML =
        '<p class="event-empty-message">There are no upcoming events at the moment. Please check back soon.</p>';
    document.querySelector('#view-all-events-container').hidden = true;
}

// Load event data from the JSON file
fetch('data/events.json')
    .then(response => {
        if (!response.ok) throw new Error('Unable to load events.json');

        return response.json();
    })
    .then(events => {
        // Separate events into upcoming and past events
        const separatedEvents = separateEvents(events);

        const upcomingEvents = separatedEvents.upcoming;
        const pastEvents = separatedEvents.past;
        const homepageUpcomingEvents = upcomingEvents.slice(0, 4);
        const latestPastEvents = pastEvents.slice(0, 4);

        if (upcomingEvents.length === 0) {
            showNoUpcomingEvents();
        } else {
            renderFeaturedEvent(upcomingEvents[0]);

            document.querySelector('#upcoming-events-list').innerHTML =
                homepageUpcomingEvents.map(createEventCard).join('');

            if (upcomingEvents.length > homepageUpcomingEvents.length) {
                document.querySelector('#view-all-events-container').hidden = false;
            }

            setupEventInteractions(upcomingEvents);
        }

        document.querySelector('#past-events-list').innerHTML =
            latestPastEvents.map(createPastEventCard).join('');

    })
    .catch(showEventError);
