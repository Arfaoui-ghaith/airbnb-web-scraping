const cheerio = require("cheerio");
const dJSON = require('dirty-json');
const priceParser = require('price-parser');
const JsonFind = require("json-find");
const {contentRequest} = require("./contentRequest");


exports.getListingdata = async (res) => {
    const $ = cheerio.load(res.data);

    let json = JSON.parse($("script[id='data-deferred-state']").text());
    json = json["niobeMinimalClientData"][0][1].data.presentation.stayProductDetailPage.sections;

    const doc = JsonFind(json);

    const {descriptionItems} = doc.findValues('descriptionItems')
    const {detailItems} = doc.findValues('detailItems')
    const {houseRules} = doc.findValues('houseRules')
    const {highlights} = doc.findValues('highlights')
    const {neighborhoodBreadcrumbDetails} = doc.findValues('neighborhoodBreadcrumbDetails')
    const {nearbyCities} = doc.findValues('nearbyCities')
    const {propertyType} = doc.findValues('propertyType')
    const {arrangementDetails} = doc.findValues('arrangementDetails')
    const {amenities} = doc.findValues('amenities')
    const {previewImages} = doc.findValues('previewImages')
    const {discountData} = doc.findValues('discountData')


    const {shortTitle} = doc.findValues('shortTitle')
    const {hostFeatures} = doc.findValues('hostFeatures')
    const {hostTags} = doc.findValues('hostTags')

    const {hostAvatar} = doc.findValues('hostAvatar')

    const {profilePictureUrl} = doc.findValues('profilePictureUrl');
    const {profileName} = doc.findValues('profileName');

    const seller = {
        badge: hostAvatar == null ? null : hostAvatar.badge,
        avatar: hostAvatar == null ? profilePictureUrl : hostAvatar.avatarImage.baseUrl,
        features: hostFeatures,
        tags: hostTags,
        name: shortTitle == null ? profileName : shortTitle
    }

    const {breadcrumbs} = doc.findValues('breadcrumbs')

    const {seeAllLocationDetails} = doc.findValues('seeAllLocationDetails')

    const locationDetails = JsonFind(seeAllLocationDetails);

    const {title} = locationDetails.checkKey('title')

    let price = priceParser.parseFirst(doc.checkKey('metaDescription'));
    let pets_allowed = `${JSON.stringify(amenities)} ${JSON.stringify(houseRules)}`.search("Pets allowed") > -1;

    const data = {
        title: `${doc.checkKey('listingTitle')}`,
        metaPrice: price === null ? {
            currencyCode: null,
            symbol: null,
            floatValue: null
        } : {currencyCode: price.currencyCode, symbol: price.symbol, floatValue: price.floatValue},
        image: doc.checkKey('pictureUrl'),
        description: `${doc.checkKey('htmlDescription') == null ? null : doc.checkKey('htmlDescription').htmlText}`.replace(';', ' '),
        category: doc.checkKey('categoryTag'),
        discount: discountData,
        rating: doc.checkKey('starRating'),
        reviewsCount: doc.checkKey('reviewCount'),
        seller,
        breadcrumbs,
        location: title,
        lat: doc.checkKey('listingLat'),
        lng: doc.checkKey('listingLng'),
        guests: doc.checkKey('personCapacity'),
        pets_allowed,
        description_items: descriptionItems,
        category_rating: [
            {name: "Accuracy", value: json.metadata.loggingContext.eventDataLogging.accuracyRating},
            {name: "Checkin", value: json.metadata.loggingContext.eventDataLogging.checkinRating},
            {name: "Cleanliness", value: json.metadata.loggingContext.eventDataLogging.cleanlinessRating},
            {name: "Communication", value: json.metadata.loggingContext.eventDataLogging.communicationRating},
            {name: "Location", value: json.metadata.loggingContext.eventDataLogging.locationRating},
            {name: "Value", value: json.metadata.loggingContext.eventDataLogging.valueRating}
        ],
        rules: houseRules,
        details: detailItems,
        highlights,
        neighborhood: neighborhoodBreadcrumbDetails,
        nearbyCities,
        arrangement_details: arrangementDetails,
        amenities: amenities == null ? null : amenities.map(a => a.title),
        images: previewImages,
        propertyType,
        url: doc.checkKey('pdpLink')
    }

    return data;
};