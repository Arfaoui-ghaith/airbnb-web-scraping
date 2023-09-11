const {existsSync, statSync, readFileSync, readdirSync, writeFileSync, appendFile} = require("fs");
const converter = require("json-2-csv");


const getDirectories = path =>
    readdirSync(path, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

const readCSV = async (path) => {
    const data = readFileSync(path, {encoding: 'utf-8'});
    if(data === ''){
        return [];
    }
    return await converter.csv2json(data, {delimiter: {field: ';'}});
}

const counting = async (path) => {
    let states = getDirectories(path)
    let total = 0;
    if(states.length > 0){
        for(let state of states){
            let count = (await readCSV(`${path}/${state}/listings.csv`)).length
            console.log(state,count)
            total+=count;
        }
        console.log('total',total);
    }
}

const categoryRating = (obj) => {
    let res = {};
    for(let r of obj){
        res[`${r.name}Rating`] = r.value
    }
    return res;
}

const formatting = async () => {
    for(let i=1; i<6; i++){
        let path = `../milestone ${i}`;
        if (existsSync(path)) {
            let states = getDirectories(path);
            if(states.length > 0){
                for(let state of states.slice(0,10)){
                    let listings = await readCSV(`${path}/${state}/listings.csv`)
                    let reviews = await readCSV(`${path}/${state}/reviews.csv`)
                    let prices = await readCSV(`${path}/${state}/prices.csv`)
                    for(let listing of listings.slice(0,1)){
                        let price = prices.find(el => el.listingId === listing.listingId);
                        let review = reviews.filter(el => el.listingId === listing.listingId);
                        let row = {
                            id: listing.listingId,
                            title: listing.title,
                            meta_price_currency: listing.metaPrice.currencyCode,
                            meta_price_symbol: listing.metaPrice.symbol,
                            meta_price_value: listing.metaPrice.floatValue,
                            price_currency: price?.currencyCode,
                            price_symbol: price?.symbol,
                            price_value: price?.floatValue,
                            image: listing.image,
                            description: listing.description,
                            category: listing.category,
                            discount: listing.discount,
                            rating: listing.rating,
                            reviews_count: listing.reviewsCount,
                            location: listing.location,
                            lat: listing.lat,
                            lng: listing.lng,
                            guests: listing.guests,
                            pets_allowed: listing.pets_allowed,
                            breadcrumbs: listing.breadcrumbs?.map(el => el.title).slice(1),
                            description_items: listing.description_items?.map(el => el.title),
                            ...categoryRating(listing.category_rating),
                            rules: listing.rules?.map(el => el.title),
                            details: listing.details?.map(el => el.title),
                            highlights: listing.highlights?.map(el => `${el.title} : ${el.subtitle}`),
                            neighborhood: listing.neighborhood[0].linkText,
                            nearby_cities: listing.nearbyCities?.map(el => el.title),
                            arrangement_details: listing.arrangement_details?.map(el => `${el.title} : ${el.subtitle}`),
                            amenities: listing.amenities,
                            images: listing.images?.map(el => el.baseUrl),
                            host_name: listing.seller.name,
                            host_badge: listing.seller.badge,
                            host_avatar: listing.seller.avatar,
                            host_features: listing.seller.features?.map(el => `${el.title} : ${el.subtitle}`),
                            host_tags: listing.seller.tags?.map(el => el.title),
                            propertyType: listing.propertyType,
                            url: listing.url,
                            reviews: review?.map(el => el.text)
                        };
                        let rowDetails = await converter.json2csv(row, {delimiter: {field: ';'}});
                        if((statSync('states.csv').size === 0)) {
                            rowDetails=rowDetails.split(';reviews\n')[1]+"\n";
                        }
                        appendFile('states.csv', rowDetails, function (err) {
                            if (err) return console.log(err);

                        });
                    }
                }
            }
        }
    }
}

formatting().then().catch()

