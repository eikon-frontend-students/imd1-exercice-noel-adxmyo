document.addEventListener('DOMContentLoaded', () => {
    
    // --- Éléments du DOM ---
    const video = document.getElementById('video-vinyle');
    const audio = document.getElementById('lecteur-audio');
    const btnLecture = document.getElementById('btn-lecture');
    const btnPrecedent = document.getElementById('btn-precedent');
    const btnSuivant = document.getElementById('btn-suivant');
    const iconeLecture = document.getElementById('icone-lecture');
    const divTitre = document.getElementById('titre-chanson');
    const canvas = document.getElementById('canvas-visualiseur');
    const canvasCtx = canvas.getContext('2d');

    // --- Playlist ---
    const listeMusiques = [
        "musiques/Frank Sinatra - Let It Snow! Let It Snow! Let It Snow!.mp3",
        "musiques/Wham - Last Christmas.mp3",
        "musiques/Frank Sinatra - Jingle Bells.mp3"
    ];

    let indexActuel = 0;
    let estEnLecture = false;

    // --- Web Audio API ---
    let audioContext;
    let analyseur;
    let source;
    let audioContextInitialise = false;

    // Charger la première piste
    chargerPiste(indexActuel, false);

    function afficherTitre(cheminFichier) {
        let nomFichier = cheminFichier.split('/').pop();
        nomFichier = nomFichier.replace('.mp3', '');
        nomFichier = decodeURIComponent(nomFichier);
        divTitre.textContent = nomFichier;
    }

    function chargerPiste(index, autoPlay) {
        audio.src = listeMusiques[index];
        afficherTitre(listeMusiques[index]);
        if (autoPlay) {
            audio.play();
            video.play();
            estEnLecture = true;
            mettreAJourIcone();
        }
    }

    // --- Initialisation Audio Context ---
    function initAudioContext() {
        if (audioContextInitialise) return;

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyseur = audioContext.createAnalyser();
        
        // 64 = 32 barres (16 à gauche, 16 à droite). C'est un bon équilibre.
        analyseur.fftSize = 32; 
        analyseur.smoothingTimeConstant = 0.8; // Réactivité

        source = audioContext.createMediaElementSource(audio);
        source.connect(analyseur);
        analyseur.connect(audioContext.destination);

        audioContextInitialise = true;
        
        // Résolution interne
        canvas.width = 600;
        canvas.height = 80;
        
        boucleVisuelle();
    }

    // --- Boucle de Dessin ---
    function boucleVisuelle() {
        requestAnimationFrame(boucleVisuelle);

        if (audio.paused) {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const bufferLength = analyseur.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyseur.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        // --- Paramètres de Style ---
        const centreX = canvas.width / 2;
        const centreY = canvas.height / 2;
        
        // Espace entre chaque barre normale
        const espaceEntreBarres = 6; 
        
        // Espace spécifique au centre (pour éviter que les deux du milieu ne se touchent)
        const espaceCentral = 3; 

        // Calcul de la largeur idéale
        // On divise l'espace disponible par le nombre de barres
        let largeurBarreCalcul = (canvas.width / 2) / bufferLength - espaceEntreBarres;
        
        // On force les barres à être plus fines (max 6px), sinon elles deviennent "grasses"
        const largeurBarre = Math.min(8, largeurBarreCalcul); 

        // Création du dégradé (Blanc -> Transparent)
        const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.0)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.9)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.0)");
        
        canvasCtx.fillStyle = gradient;
        canvasCtx.shadowBlur = 8;
        canvasCtx.shadowColor = "rgba(255, 255, 255, 0.5)";

        for(let i = 0; i < bufferLength; i++) {
            // Hauteur basée sur le volume de la fréquence
            let barHeight = (dataArray[i] / 255) * canvas.height;
            barHeight = Math.max(4, barHeight); // Hauteur minimum

            // Rayon pour l'arrondi (moitié de la largeur)
            const rayon = largeurBarre / 2;
            const yPos = centreY - (barHeight / 2);

            // --- Calcul des positions X avec Espacement Central ---
            
            // Le décalage prend en compte l'index, la largeur ET l'espace central
            const offset = espaceCentral + (i * (largeurBarre + espaceEntreBarres));

            // Côté Droit (Part du centre + espace vers la droite)
            const xDroit = centreX + offset;

            // Côté Gauche (Part du centre - espace - largeur vers la gauche)
            const xGauche = centreX - offset - largeurBarre;

            // Dessin Droite
            canvasCtx.beginPath();
            if (canvasCtx.roundRect) {
                canvasCtx.roundRect(xDroit, yPos, largeurBarre, barHeight, rayon);
            } else {
                canvasCtx.rect(xDroit, yPos, largeurBarre, barHeight);
            }
            canvasCtx.fill();

            // Dessin Gauche
            canvasCtx.beginPath();
            if (canvasCtx.roundRect) {
                canvasCtx.roundRect(xGauche, yPos, largeurBarre, barHeight, rayon);
            } else {
                canvasCtx.rect(xGauche, yPos, largeurBarre, barHeight);
            }
            canvasCtx.fill();
        }
    }

    // --- Contrôles ---
    function mettreAJourIcone() {
        if (estEnLecture) {
            iconeLecture.classList.replace('fa-play', 'fa-pause');
            video.style.transform = "scale(1.02)";
        } else {
            iconeLecture.classList.replace('fa-pause', 'fa-play');
            video.style.transform = "scale(1)";
        }
    }

    function basculerLecture() {
        initAudioContext();
        if (audioContext.state === 'suspended') audioContext.resume();

        if (estEnLecture) {
            audio.pause();
            video.pause();
            estEnLecture = false;
        } else {
            audio.play();
            video.play();
            estEnLecture = true;
        }
        mettreAJourIcone();
    }

    function changerPiste(direction) {
        if (direction === 'suivant') {
            indexActuel = (indexActuel + 1) % listeMusiques.length;
        } else {
            indexActuel = (indexActuel - 1 + listeMusiques.length) % listeMusiques.length;
        }
        chargerPiste(indexActuel, estEnLecture); 
    }

    btnLecture.addEventListener('click', basculerLecture);
    btnSuivant.addEventListener('click', () => {
        if(!estEnLecture) { changerPiste('suivant'); } 
        else { changerPiste('suivant'); video.play(); }
    });
    btnPrecedent.addEventListener('click', () => {
        if(!estEnLecture) { changerPiste('precedent'); } 
        else { changerPiste('precedent'); video.play(); }
    });
    audio.addEventListener('ended', () => changerPiste('suivant'));
});