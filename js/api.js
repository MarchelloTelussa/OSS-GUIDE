export async function getAllData () {
    let allData = [];
    try {
        const response = await fetch('/data/guides.json');
        allData = await response.json();
    } catch (error) {
        console.error("Failed to load database: ", error);
    }
    return allData;
}

export async function getSpecData () {
    let specData = [];
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const dataId = urlParams.get('id');

        if (!dataId) {
            console.error("Page ID not found in URL parameters.");
            return;
        }
        const result = await getAllData();
        specData = result.find(item => item.id == dataId);

        if (!specData) {
            console.error("Guide not found!");
        }
    } catch (error) {
        console.error("Failed to load database: ", error)
    }
    return specData;
}