const { scrapeListingsByState } = require('./scrapeListingsByState');
const sequmise = require('sequmise')

const geo = require('countrycitystatejson');
let State = require('country-state-city').State;
let City = require('country-state-city').City;

let states = ['Alaska', 'Alabama', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska',
    'Nevada', 'New-Hampshire', 'New-Jersey', 'New-Mexico', 'New-York', 'North-Carolina', 'North-Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode-Island', 'South-Carolina', 'South-Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West-Virginia', 'Wisconsin', 'Wyoming', 'Guam', 'Puerto-Rico', 'American-Samoa', 'United-States-Virgin-Islands','Baker-Island', 'District-of-Columbia',
    'Howland-Island', 'Jarvis-Island', 'Johnston-Atoll','Kingman-Reef','Midway-Atoll','Navassa-Island','Northern-Mariana-Islands','Palmyra-Atoll',
    'United-States-Minor-Outlying-Islands','Wake-Island']

states = states.concat(State.getStatesOfCountry('US').filter(el => !states.includes(el.name.replaceAll(' ','-'))).map(el => el.name.replaceAll(' ','-')));
unlistedStates = State.getStatesOfCountry('US');

states = states.map(el => {
	return unlistedStates.find(s => s.name == el.replaceAll('-',' '))
});
console.log(states.slice(53,55));

let areas = [];
for( let state of states.slice(53,55)){
    let i=0;
   
let cities = City.getCitiesOfState('US', state.isoCode)
if(cities.length !== 0){
    for(let city of cities){
        i++;
        areas.push({state: state.name, city: city.name, order: i, amount: cities.length});
    }
}else{ areas.push({state: state.name, city: state.name, order: i, amount: cities.length}); }
}

let promises = areas.map(area => async () => {
    let { state, city, order, amount } = area;
let urlBase = `https://www.airbnb.com/s/${state.replaceAll(' ','-')}--United-States/homes`;
if(city != null){
    	urlBase = `https://www.airbnb.com/s/${city.replaceAll(' ','-')}--${state.replaceAll(' ','-')}--United-States/homes`;
}
    let resultPath = `../states/${state.toLowerCase()}`;

    await scrapeListingsByState(urlBase, resultPath, state, city, order, amount);
})

sequmise(promises).then().catch();







