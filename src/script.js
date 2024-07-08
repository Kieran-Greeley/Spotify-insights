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

// export function toggleDarkMode(){
//   console.log("dark mode toggle test1");
//   const body = document.documentElement;
//   body.classList.toggle('dark');
//   console.log("dark mode toggle test2");
// }

function createCard(name, image, subtext, type){
  //create padding
  const outerPadding = document.createElement('div');
  outerPadding.className = "inline-block px-2";

  //create card
  let card = document.createElement("div");
  card.style.backgroundColor = "#2a2a2a";
  card.style.borderColor = "#121212";
  card.className = "w-64 max-w-xs rounded-3xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 ease-in-out";
  //adding pictures to card
  let picture = document.createElement("img");
  picture.className = "rounded-t-lg";
  picture.src = image;
  card.appendChild(picture);

  //creating space between picture and name
  const innerPadding = document.createElement('div');
  innerPadding.className = "p-3";

  //adding name to card
  let card_name = document.createElement("h5");
  card_name.innerHTML = name;
  card_name.className = "text-xl font-bold tracking-tight text-white";
  innerPadding.appendChild(card_name);

  //adding subtext to card
  const cardSubtext = document.createElement('h5');
  cardSubtext.innerHTML = subtext;
  cardSubtext.style.color = "#727272"
  cardSubtext.className = "mb-1 font-normal";
  innerPadding.appendChild(cardSubtext);

  card.appendChild(innerPadding);
  outerPadding.appendChild(card);
  let type_name = type + "_cards"
  document.getElementById(type_name).appendChild(outerPadding);
}

function convertFromMilliseconds(ms){
  let totSeconds = Math.floor(ms / 1000);
  let minutes = Math.floor(totSeconds / 60);
  let seconds = totSeconds % 60;
  if (seconds < 10){
    return minutes+":0"+seconds;
  }else{
    return minutes+":"+seconds;
  }
}

function populateUI(profile, artists, tracks) {
  //create profile box
  if (profile.images[0]) {
    const img = document.createElement('img');
    img.className = "rounded-full border-2";
    img.src = profile.images[0].url;
    document.getElementById("profile-box").appendChild(img);
  }
  var profile_text = document.createElement("div");
  var name = document.createElement("a");
  name.innerText = profile.display_name;
  name.href = profile.external_urls.spotify;
  name.className = 'underline';
  profile_text.appendChild(name);

  var email = document.createElement("p");
  email.innerText = profile.email;
  email.style.color = "#727272";
  email.className = 'text-sm';
  profile_text.appendChild(email);

  document.getElementById("profile-box").appendChild(profile_text);

  let artist_name = [];
  let artist_pop = [];
  let artist_pic = [];
  let artist_index = 1;
  let average_pop = 0;
  for(let i of artists.items){
    artist_name.push(i.name);
    artist_pop.push(i.popularity);
    average_pop += i.popularity;
    createCard("#" + artist_index + ": " + i.name, i.images[0].url, i.genres[0], "artists");
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
      createCard("#" + song_index + ": " + i.name, i.album.images[0].url, i.artists[0].name+" "+convertFromMilliseconds(i.duration_ms), "tracks");
      song_index++;
    }
    console.log(song_artists_dict);
    average_pop = average_pop/tracks.limit;
    let song_avg = document.createElement("p");
    song_avg.innerHTML = "your average song popularity score is: " + average_pop;
    document.getElementById("tracks_avg_popularity").appendChild(song_avg);

    const artist_popularity_chart = document.getElementById('artists-popularity-bargraph');
    const tracks_popularity_graph = document.getElementById('tracks-popularity-bargraph');
    const tracks_artists_chart1 = document.getElementById('tracks-artists-barchart');
    const tracks_artists_chart2 = document.getElementById('tracks-artists-piechart');

    //charts
    new Chart(artist_popularity_chart, {
        type: 'bar',
        data: {
          labels: artist_name,
          datasets: [{
            label: 'Popularity Score',
            data: artist_pop,
            backgroundColor: 'rgba(30, 215, 96, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              suggestedMax: 100,
              beginAtZero: true,
              ticks: {
                stepSize: 10,
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
      
    new Chart(tracks_popularity_graph, {
      type: 'bar',
      data: {
        labels: song_name,
        datasets: [{
          label: 'Popularity Score',
          data: song_pop,
          backgroundColor: 'rgba(30, 215, 96, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            suggestedMax: 100,
            beginAtZero: true,
            ticks: {
              stepSize: 10,
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

    new Chart(tracks_artists_chart1, {
      type: 'bar',
      data: {
        labels: Object.keys(song_artists_dict),
        datasets: [{
          label: 'Number of songs per artist',
          data: Object.values(song_artists_dict),
          backgroundColor: 'rgba(30, 215, 96, 1)',
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

    new Chart(tracks_artists_chart2, {
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