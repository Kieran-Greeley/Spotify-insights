import config from './config.js';
const clientId = config.CLIENT_ID;
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    console.log(profile);
    const artists = await fetchTopArtist(accessToken);
    console.log(artists);
    populateUI(profile, artists);
}


export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("scope", "user-read-private user-read-email user-top-read");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


export async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

async function fetchTopArtist(token){
    const result = await fetch("https://api.spotify.com/v1/me/top/artists", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

function populateUI(profile, artists) {
    document.getElementById("displayName").innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar").appendChild(profileImage);
        document.getElementById("imgUrl").innerText = profile.images[0].url;
    }
    document.getElementById("id").innerText = profile.id;
    document.getElementById("email").innerText = profile.email;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url").innerText = profile.href;
    document.getElementById("url").setAttribute("href", profile.href);

    let artist_name = [];
    let artist_pop = [];
    let average_pop = 0;
    for(let i of artists.items){
        artist_name.push(i.name);
        artist_pop.push(i.popularity);
        let artist = document.createElement("li");
        artist.innerHTML = i.name + " " + " " + i.popularity;
        document.getElementById("top-artists").appendChild(artist);
        average_pop += i.popularity;
    }
    average_pop = average_pop/artists.limit; 
    let avg = document.createElement("p");
    avg.innerHTML = "your average popularity score is: " + average_pop;
    document.getElementById("artists").appendChild(avg);

    const ctx = document.getElementById('artists-graph');

    new Chart(ctx, {
        type: 'bar',
        data: {
          labels: artist_name,
          datasets: [{
            label: 'Popularity Score',
            data: artist_pop,
            backgroundColor: 'rgba(20, 205, 86, 1)',
            //borderColor: 'rgb(20, 205, 86)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: 'lightgrey', // color of y-axis ticks
                font: {
                  family: 'Arial', // font family of y-axis ticks
                  size: 14, // font size of y-axis ticks
                  style: 'italic', // font style of y-axis ticks
                  weight: 'bold', // font weight of y-axis ticks
                }
              },
              grid: {
                color: 'lightgrey', // color of y-axis grid lines
                lineWidth: 2 // width of y-axis grid lines
              }
            },
            x: {
              ticks: {
                color: 'lightgrey', // color of x-axis ticks
                font: {
                  family: 'Arial', // font family of x-axis ticks
                  size: 14, // font size of x-axis ticks
                  style: 'italic', // font style of x-axis ticks
                  weight: 'bold', // font weight of x-axis ticks
                }
              },
              grid: {
                color: 'lightgrey', // color of x-axis grid lines
                lineWidth: 0 // width of x-axis grid lines
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: 'lightgrey', // color of legend text
                font: {
                  family: 'Arial', // font family of legend text
                  size: 14, // font size of legend text
                  style: 'italic', // font style of legend text
                  weight: 'bold', // font weight of legend text
                }
              }
            }
          }
        }
      });      
}