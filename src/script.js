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
    const tracks = await fetchTopTracks(accessToken);
    console.log(artists);
    console.log(tracks);
    populateUI(profile, artists, tracks);
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

async function fetchTopTracks(token){
  const result = await fetch("https://api.spotify.com/v1/me/top/tracks", {
      method: "GET", headers: { Authorization: `Bearer ${token}` }
  });

  return await result.json();
}

function createCard(name, image, type){
    let card = document.createElement("div");
    card.className = "card"
    let picture = document.createElement("img");
    picture.src = image;
    card.appendChild(picture);
    let card_name = document.createElement("h3");
    card_name.innerHTML = name;
    card.appendChild(card_name);
    let type_name = type + "_cards"
    document.getElementById(type_name).appendChild(card);
}

function populateUI(profile, artists, tracks) {
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
    let artist_pic = [];
    let artist_index = 1;
    let average_pop = 0;
    for(let i of artists.items){
        artist_name.push(i.name);
        artist_pop.push(i.popularity);
        //artist_pic.push(i.images[0].url);
        //let artist = document.createElement("li");
        // artist.innerHTML = i.name;
        // document.getElementById("top-artists").appendChild(artist);
        average_pop += i.popularity;
        // let picture = document.createElement("img");
        // picture.src = i.images[0].url;S
        // document.getElementById("top-artists").appendChild(picture);
        //let artist_name = artist_index + ". " + i.name;
        createCard(artist_index + ". " + i.name, i.images[0].url, "artists");
        artist_index++;
    }
    average_pop = average_pop/artists.limit; 
    let artist_avg = document.createElement("p");
    artist_avg.innerHTML = "your average artist popularity score is: " + average_pop;
    document.getElementById("artists_avg_popularity").appendChild(artist_avg);

    let song_name = [];
    let song_pop = [];
    let song_artists_dict = {};
    let song_index = 1;
    average_pop = 0;
    for(let i of tracks.items){
      average_pop += i.popularity;
      song_pop.push(i.popularity);
      song_name.push(i.name);
      for(let j of i.artists){
        if (j.name in song_artists_dict){
          song_artists_dict[j.name] += 1;
        }else{
          song_artists_dict[j.name] = 1;
        }
      }
      createCard(song_index + ". " + i.name, i.album.images[0].url, "tracks");
      song_index++;
    }
    console.log(song_artists_dict);
    average_pop = average_pop/tracks.limit;
    let song_avg = document.createElement("p");
    song_avg.innerHTML = "your average song popularity score is: " + average_pop;
    document.getElementById("tracks_avg_popularity").appendChild(song_avg);

    const artist_chart1 = document.getElementById('artists-popularity-bargraph');
    const tracks_chart1 = document.getElementById('tracks-popularity-bargraph');
    const tracks_chart2 = document.getElementById('tracks-artists-piechart');

    new Chart(artist_chart1, {
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
      
    new Chart(tracks_chart1, {
      type: 'bar',
      data: {
        labels: song_name,
        datasets: [{
          label: 'Popularity Score',
          data: song_pop,
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

    new Chart(tracks_chart2, {
      type: 'pie',
      data: {
          labels: Object.keys(song_artists_dict),
          datasets: [{
            label: 'Top Artists Based on Top Songs',
            data: Object.values(song_artists_dict),
            backgroundColor: [
              'rgb(0, 222, 18)',
              '#70e000',
              '#ccff33',
              '#0d9e0d',
              '#0F7436'
            ],
            borderWidth: 1
          }]
      },
      options: {
        plugins: {
            legend: {
                display: false
            }
        }
      }
    });
}