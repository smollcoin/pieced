

window.addEventListener('load', () => {

    // grab difficulty from storage and set global variable
    chrome.storage.sync.get({ dividers: 3 }, (data) => {
        dividers = data.dividers
        solvedSequence = buildSolvedSequence(dividers)


        document.querySelectorAll('img, canvas')?.forEach(handleElement)
        observeForNewImages()
        detectMovement() // call detect movement
    })

});

// puzzle tracker
var activePuzzle = null // tracks which puzzle is currently active
var dividers = 2
puzzleStartTime = null

// set to the clicked puzzle's data when a puzzle is clicked
var grid = []
var emptyPos = { row: -1, col: -1 }
var tileEls = []


// precomputed solved sequence
// immediately invoked function expression: function() {...}() returns a value and assign it to a variable in one go 
var solvedSequence = buildSolvedSequence(dividers)

function buildSolvedSequence(size) {
    const seq = []
    for (var i = 0; i < size; i++) {
        seq.push([])
        for (var j = 0; j < size; j++) {
            const flatIndex = i * size + j
            const isLastCell = flatIndex === size * size - 1 // grab the last cell based on the size
            if (isLastCell) {
                seq[i].push(0)
            }
            else {
                seq[i].push(flatIndex + 1)
            }
        }
    }
    return seq // the precomputed sequence
}



function observeForNewImages() {
    // watch for changes in the tree only after DOM loads
    const observer = new MutationObserver(mutations => {

        // loop through the mutations, and then the nodes in that particular mutation
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;

                if (node instanceof HTMLCanvasElement || node instanceof HTMLImageElement) {
                    handleElement(node);
                }

                node.querySelectorAll?.('img, canvas')?.forEach(handleElement)
            })
        })
    }
    )
    // args: which to observe, options
    observer.observe(document.body, {
        childList: true, // watch for any added or removed nodes
        subtree: true // watch for node children
    }

    )
}

// only run the function if it is not scrambled.
function handleElement(element) {

    //  puzzleprocessed is a custom attribute to keep track on whether the image has been processed into a puzzle
    if (element.dataset.puzzleProcessed) return;
    element.dataset.puzzleProcessed = 'true'

    if (element instanceof HTMLCanvasElement) {
        setUpPuzzle(element);
    } else if (element instanceof HTMLImageElement) {
        if (element.complete) {
            setUpPuzzle(element);
        } else {
            // once: true means that it fires only once
            element.addEventListener('load', () => setUpPuzzle(element), { once: true });
        }
    }
}

function identifyElement(element) {

    // is this element a canvas tag or nah
    if (element instanceof HTMLCanvasElement) {
        return {
            imageLink: element.toDataURL(), // data uri of canvas img
            imageWidth: element.width,
            imageHeight: element.height
        }
    }
    else if (element instanceof HTMLImageElement)
        return {
            imageLink: element.currentSrc || element.src,
            imageWidth: element.width,
            imageHeight: element.height
        }

    // if unsupported
    return null
}

function setUpPuzzle(element) {
    console.log("Checking set up puzzle")
    const imgData = identifyElement(element)
    if (!imgData) return

    const { imageLink, imageWidth, imageHeight } = imgData

    // local variables for this puzzle only - not shared with other puzzles
    const localGrid = []
    const localTileEls = []
    const localEmptyPos = { row: -1, col: -1 }
    var localTileNumber = 1

    // replace the image with a div which will carry all the puzzle pieces
    const puzzleContainer = document.createElement('div')
    puzzleContainer.style.width = `${imageWidth}px`
    puzzleContainer.style.height = `${imageHeight}px`


    // grid css
    puzzleContainer.style.display = 'grid'
    puzzleContainer.style.gridTemplateColumns = `repeat(${dividers}, 1fr)`



    // find width and height of one piece
    const pieceWidth = imageWidth / dividers
    const pieceHeight = imageHeight / dividers


    // for each row
    for (var i = 0; i < dividers; i++) {
        localGrid.push([])
        // for each column
        for (var j = 0; j < dividers; j++) {


            // create the tile
            const tile = document.createElement('div')

            // offset for each tile: each piece will go -> then down
            const xOffset = j * pieceWidth
            const yOffset = i * pieceHeight

            tile.dataset.tileNumber = localTileNumber
            localGrid[i].push(localTileNumber)
            localTileEls.push(tile) // store tile DOM reference
            localTileNumber += 1


            // tile styling
            tile.style.width = `${pieceWidth}px`
            tile.style.height = `${pieceHeight}px`

            tile.style.backgroundImage = `url(${imageLink})`
            tile.style.backgroundSize = `${imageWidth}px ${imageHeight}px`

            // args: negative means that you are moving towards the left and top

            tile.style.backgroundPosition = `-${xOffset}px -${yOffset}px`

            tile.style.border = '1px solid black'

            // if it is the last tile 
            if (i === dividers - 1 && j === dividers - 1) {
                tile.style.backgroundImage = 'None'
                tile.textContent = "Empty"
                tile.style.backgroundColor = "White"
                tile.style.color = "Black"
                tile.style.textDecoration = "None"

                tile.style.display = 'flex'
                tile.style.alignItems = 'center'
                tile.style.justifyContent = 'center'
                tile.style.boxSizing = 'border-box'
                localEmptyPos["row"] = i
                localEmptyPos["col"] = j

                // store the actual image and everything using dataset
                tile.dataset.imageLink = imageLink
                tile.dataset.imageWidth = imageWidth
                tile.dataset.imageHeight = imageHeight
            }

            puzzleContainer.appendChild(tile)
        }
    }

    // replace image with container
    element.parentNode.replaceChild(puzzleContainer, element)

    // scramble on load using local variables — globals not set yet
    realScramble(localGrid, localTileEls, localEmptyPos)

    // add click listener so only active then can move
    // point the global trackers at this puzzle's local data
    puzzleContainer.addEventListener('click', (event) => {
        event.preventDefault()

        if (activePuzzle !== puzzleContainer) {
            // save previous puzzle time
            if (puzzleStartTime != null) {
                const timeTaken = (new Date() - puzzleStartTime) / 1000 // in seconds
                chrome.storage.sync.get({ totalTime: 0 }, (data) => {
                    const newTotalTime = data.totalTime + timeTaken
                    chrome.storage.sync.set({ totalTime: newTotalTime })
                })
            }

            // new puzzle clicked — switch globals to this puzzle's data
            activePuzzle = puzzleContainer
            grid = localGrid
            tileEls = localTileEls
            // sync emptyPos to wherever the empty tile is after scramble
            emptyPos.row = localEmptyPos.row
            emptyPos.col = localEmptyPos.col

            puzzleStartTime = new Date() // start the timer when the puzzle is clicked
        }
    })
}

// swap tiles in DOM by moving the actual elements
// tilesArray: the tileEls array to use (local or global)
function swapTiles(r1, c1, r2, c2, tilesArray) {
    const idx1 = r1 * dividers + c1
    const idx2 = r2 * dividers + c2
    const t1 = tilesArray[idx1]
    const t2 = tilesArray[idx2]
    const parent = t1.parentNode

    // insertBefore with the other element as reference swaps their positions in the grid
    const placeholder = document.createTextNode('')
    parent.insertBefore(placeholder, t1)
    parent.insertBefore(t1, t2)
    parent.insertBefore(t2, placeholder)
    placeholder.remove()

    // keep tilesArray in sync
    tilesArray[idx1] = t2
    tilesArray[idx2] = t1
}

function detectMovement() {
    window.addEventListener("keydown", (event) => {

        const arrowKeys = ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]

        if (arrowKeys.includes(event.key)) {
            event.preventDefault() // prevent default action from taking place
            event.stopPropagation() // only stop propagation for arrow keys
        }

        if (activePuzzle === null) return;

        // use globals — set when user clicks a puzzle
        applyMove(event.key, grid, tileEls, emptyPos, checkforWin = true)

    },
        { capture: true } // most event listeners are in the bubble phase.
        //  register listener in the capture phase, to run it before other event listeners
    )
}


function realScramble(localGrid, localTileEls, localEmptyPos) {
    const moves = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]

    for (var i = 0; i < 40; i++) {
        // pick a random valid move
        const validMoves = moves.filter(move => {
            if (move === "ArrowUp" && localEmptyPos.row === dividers - 1) return false // this is out of range
            if (move === "ArrowDown" && localEmptyPos.row === 0) return false // also
            if (move === "ArrowLeft" && localEmptyPos.col === dividers - 1) return false
            if (move === "ArrowRight" && localEmptyPos.col === 0) return false
            return true
        })
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)] // random move
        applyMove(randomMove, localGrid, localTileEls, localEmptyPos, checkforWin = false)
    }
}

// Shared Function for realScramble and detectMovement
// localGrid, localTileEls, localEmptyPos can be either local (scramble) or global (detect movement)
function applyMove(move, localGrid, localTileEls, localEmptyPos, checkforWin) {
    const row = localEmptyPos.row
    const col = localEmptyPos.col

    switch (move) {
        case "ArrowDown":
            if (row === 0) break
            swapTiles(row, col, row - 1, col, localTileEls)
            localGrid[row][col] = localGrid[row - 1][col]
            localGrid[row - 1][col] = 0
            localEmptyPos.row -= 1
            break
        case "ArrowUp":
            if (row === dividers - 1) break
            swapTiles(row, col, row + 1, col, localTileEls)
            localGrid[row][col] = localGrid[row + 1][col]
            localGrid[row + 1][col] = 0
            localEmptyPos.row += 1
            break
        case "ArrowLeft":
            if (col === dividers - 1) break
            swapTiles(row, col, row, col + 1, localTileEls)
            localGrid[row][col] = localGrid[row][col + 1]
            localGrid[row][col + 1] = 0
            localEmptyPos.col += 1
            break
        case "ArrowRight":
            if (col === 0) break
            swapTiles(row, col, row, col - 1, localTileEls)
            localGrid[row][col] = localGrid[row][col - 1]
            localGrid[row][col - 1] = 0
            localEmptyPos.col -= 1
            break
    }

    // check for win condition
    if (checkWin(localGrid) && checkforWin) {
        // remove borders from all tiles
        localTileEls.forEach(tile => tile.style.border = 'none')

        // make last image become normal
        const emptyTile = localTileEls[dividers * dividers - 1]
        emptyTile.style.backgroundImage = `url(${emptyTile.dataset.imageLink})`
        emptyTile.style.backgroundSize = `${emptyTile.dataset.imageWidth}px ${emptyTile.dataset.imageHeight}px`
        emptyTile.style.backgroundColor = ''
        emptyTile.textContent = ''

        // fire the confetti
        party.confetti(document.body, {
            count: party.variation.range(200, 300)
        })

        // stats 

        // puzzle solved
        chrome.storage.sync.get({ puzzlesSolved: 0 }, (data) => {
            const newCount = data.puzzlesSolved + 1
            chrome.storage.sync.set({ puzzlesSolved: newCount })
        })

        // time spent in total
        chrome.storage.sync.get({ totalTime: 0 }, (data) => {
            const timeTaken = (new Date() - puzzleStartTime) / 1000 // in seconds
            const newTotalTime = data.totalTime + timeTaken
            chrome.storage.sync.set({ totalTime: newTotalTime })
        })

    }
}


// win stuff
// win check condition
function checkWin(localGrid) {
    for (var i = 0; i < dividers; i++) {
        for (var j = 0; j < dividers; j++) {
            if (localGrid[i][j] !== solvedSequence[i][j]) return false
        }
    }
    return true

}

