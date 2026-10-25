import config from '../../public/rasid-config.js';
export {config};
const code=v=>Number.isInteger(v)&&[0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99].includes(v);
// Bounds check representation, not local hazard thresholds. Missing values stay null.
export const fields={
 temperature_2m:{unit:'°C',valid:v=>v>=-90&&v<=65},apparent_temperature:{unit:'°C',valid:v=>v>=-110&&v<=85},
 relative_humidity_2m:{unit:'%',valid:v=>v>=0&&v<=100},precipitation_probability:{unit:'%',valid:v=>v>=0&&v<=100},
 precipitation:{unit:'mm',valid:v=>v>=0},weather_code:{unit:'wmo code',valid:code},wind_speed_10m:{unit:'km/h',valid:v=>v>=0},
 wind_gusts_10m:{unit:'km/h',valid:v=>v>=0},wind_direction_10m:{unit:'°',valid:v=>v>=0&&v<=360},uv_index:{unit:'',valid:v=>v>=0},
 cloud_cover:{unit:'%',valid:v=>v>=0&&v<=100},visibility:{unit:'m',valid:v=>v>=0}
};
export const dailyFields={weather_code:fields.weather_code,temperature_2m_max:fields.temperature_2m,temperature_2m_min:fields.temperature_2m,precipitation_probability_max:fields.precipitation_probability,precipitation_sum:fields.precipitation};
export function sourceUrl(role='primary',model=null){
 const dust=role==='dust',u=new URL(dust?'https://air-quality-api.open-meteo.com/v1/air-quality':'https://api.open-meteo.com/v1/forecast');
 const p=new URLSearchParams({latitude:String(config.latitude),longitude:String(config.longitude),timezone:config.timezone,forecast_days:dust?'3':String(config.days)});
 if(dust){p.set('hourly','dust');p.set('domains','cams_global');}
 else{p.set('temperature_unit','celsius');p.set('wind_speed_unit','kmh');p.set('precipitation_unit','mm');if(model)p.set('models',model);
 if(role==='comparison')p.set('daily','temperature_2m_max,temperature_2m_min,precipitation_sum');
 else{p.set('current',Object.keys(fields).filter(k=>!['uv_index','visibility','precipitation_probability'].includes(k)).join(','));p.set('hourly',Object.keys(fields).join(','));p.set('daily',Object.keys(dailyFields).join(','));}}
 u.search=p;return u.href;
}
export const sources={forecast:{provider:'Open-Meteo',kind:'model_forecast',licence:'CC BY 4.0; free endpoint for non-commercial evaluation only',issuedAt:null},dust:{provider:'CAMS Global via Open-Meteo',kind:'model_forecast',nativeStepMinutes:180,nominalCycleHours:12,licence:'CAMS attribution + Open-Meteo terms',issuedAt:null}};
