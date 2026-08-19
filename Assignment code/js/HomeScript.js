$(document).ready(function () {

    // Select the interactive panel
    const $playground = $("#motionPlayground");

    // Stop if the panel does not exist
    if ($playground.length === 0) {
        return;
    }
    const $playgroundLabel = $("#playgroundLabel");
    const $creativePrompt = $("#creativePrompt");
    const $playgroundDescription =$("#playgroundDescription");

    const creativeTopics = ["animation","design","video"];

    // Current topic position
    let currentTopicIndex = 0;

    // Prevent repeated API requests
    let requestInProgress = false;

    // Select each shape and give it a movement strength
    const shapes = [
        {
            element: $playground.find(".shape-one"),
            strength: 35
        },
        {
            element: $playground.find(".shape-two"),
            strength: -25
        },
        {
            element: $playground.find(".shape-three"),
            strength: 18
        }
    ];

    // Current visual state
    let currentState = 1;

    // Check the user's motion accessibility setting
    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    // Move shapes when the mouse moves inside the panel
    $playground.on("pointermove", function (event) {

        // Do not use the follow effect for touch screens
        const pointerType = event.originalEvent.pointerType;

        if (pointerType && pointerType !== "mouse") {
            return;
        }

        // Disable movement when reduced motion is enabled
        if (reduceMotion.matches) {
            return;
        }

        // Get the panel's position and size
        const panel = this.getBoundingClientRect();

        // Convert mouse position to a value between -0.5 and 0.5
        const mouseX =
            (event.originalEvent.clientX - panel.left) / panel.width - 0.5;

        const mouseY =
            (event.originalEvent.clientY - panel.top) / panel.height - 0.5;

        // Move every shape using a different strength
        shapes.forEach(function (shape) {

            const moveX = mouseX * shape.strength;
            const moveY = mouseY * shape.strength;

            shape.element.css({
                "--move-x": moveX + "px",
                "--move-y": moveY + "px"
            });
        });
    });

    // Return shapes to their state positions
    $playground.on("pointerleave", function () {
        resetMovement();
    });

    // Change design when the panel is clicked
    $playground.on("click", function () {
        remixPlayground();
    });

    // Keyboard accessibility
    $playground.on("keydown", function (event) {

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            remixPlayground();
        }
    });


    function remixPlayground() {

        // Do nothing when an API request is still loading
        if (requestInProgress) {
            return;
        }

        // Continue changing the visual shapes
        changeVisualState();

        // Move to the next API topic
        currentTopicIndex++;

        if (currentTopicIndex >= creativeTopics.length) {
            currentTopicIndex = 0;
        }

        // Request new creative words
        loadCreativePrompt(
            creativeTopics[currentTopicIndex]
        );
    }

    function loadCreativePrompt(topic) {

        requestInProgress = true;

        $playground.attr("aria-busy", "true");

        $playgroundLabel.text(
            "GENERATING IDEA..."
        );

        $creativePrompt.text(
            "Finding creative words"
        );

        $playgroundDescription.text(
            "Please wait"
        );

        $.ajax({
            url: "https://api.datamuse.com/words",
            method: "GET",
            dataType: "json",

            data: {
                ml: topic,
                max: 20
            }
        })
        .done(function (response) {

            const selectedWords =
                selectCreativeWords(response, 3);

            if (selectedWords.length < 3) {
                showFallbackPrompt();
                return;
            }

            $playgroundLabel.text(
                "LIVE CREATIVE PROMPT"
            );

            $creativePrompt.text(
                selectedWords.join(" · ")
            );

            $playgroundDescription.text(
                "Click to remix · Powered by Datamuse"
            );

            $playground
                .find(".playground-status")
                .text(
                    "Creative prompt: " +
                    selectedWords.join(", ") +
                    ". Visual style " +
                    currentState +
                    " of 3."
                );
        })
        .fail(function () {

            showFallbackPrompt();

        })
        .always(function () {

            requestInProgress = false;

            $playground.attr(
                "aria-busy",
                "false"
            );
        });
    }

    function selectCreativeWords(response, amount) {

        if (!Array.isArray(response)) {
            return [];
        }

        const availableWords = [
            ...new Set(
                response
                    .map(function (item) {
                        return item.word;
                    })
                    .filter(function (word) {
                        return (
                            typeof word === "string" &&
                            word.trim() !== ""
                        );
                    })
            )
        ];

        const selectedWords = [];

        while (
            selectedWords.length < amount &&
            availableWords.length > 0
        ) {
            const randomIndex = Math.floor(
                Math.random() *
                availableWords.length
            );

            const selectedWord =
                availableWords.splice(
                    randomIndex,
                    1
                )[0];

            selectedWords.push(
                capitalizeWord(selectedWord)
            );
        }

        return selectedWords;
    }

    function capitalizeWord(word) {

            return (
                word.charAt(0).toUpperCase() +
                word.slice(1)
            );
        }
        function showFallbackPrompt() {

        $playgroundLabel.text(
            "CREATIVE PROMPT"
        );

        $creativePrompt.text(
            "Imagine · Create · Share"
        );

        $playgroundDescription.text(
            "Click to try again"
        );

        $playground
            .find(".playground-status")
            .text(
                "The creative prompt API could not be loaded."
            );
    }

    // Reset mouse movement values
    function resetMovement() {

        shapes.forEach(function (shape) {
            shape.element.css({
                "--move-x": "0px",
                "--move-y": "0px"
            });
        });
    }

    // Cycle through state 1, state 2 and state 3
    function changeVisualState() {

        $playground.addClass("is-changing");

        window.setTimeout(function () {

            // Remove the current state class
            $playground.removeClass(
                "state-1 state-2 state-3"
            );

            // Go to the next state
            currentState++;

            if (currentState > 3) {
                currentState = 1;
            }

            // Add the new state class
            $playground.addClass(
                "state-" + currentState
            );

            // Update screen-reader message
            $playground
                .find(".playground-status")
                .text(
                    "Visual style " +
                    currentState +
                    " of 3"
                );

            // Remove the temporary fade
            $playground.removeClass("is-changing");

            // Return pointer movement to zero
            resetMovement();

        }, 140);
    }

    // Load the first API prompt when Home opens
    loadCreativePrompt(
        creativeTopics[currentTopicIndex]
    );
});


