// select diificulty
document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('difficulty')

    // read dividers from storage
    chrome.storage.sync.get({ dividers: 3 }, (data) => {
        select.value = data.dividers
    })

    // save difficulty to storage
    select.addEventListener('change', (event) => {
        const difficulty = event.target.value
        chrome.storage.sync.set({ dividers: difficulty })
        chrome.tabs.reload() // reload the page to apply new difficulty
    })


})

// return number of puzzles solved 
document.addEventListener('DOMContentLoaded', () => {
    const puzzlesSolvedElement = document.getElementById('solved-count')
    chrome.storage.sync.get({ puzzlesSolved: 0 }, (data) => {
        puzzlesSolvedElement.textContent = data.puzzlesSolved
    })
})

// return total time spent solving puzzles in minutes and seconds
document.addEventListener('DOMContentLoaded', () => {  
    const timeSpentElement = document.getElementById('time-wasted')
    chrome.storage.sync.get({ totalTime: 0 }, (data) => {
        const totalSeconds = data.totalTime
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = Math.round(totalSeconds % 60)
        timeSpentElement.textContent = `Total time wasted: ${minutes}m ${seconds}s`
    })
}) 


    
