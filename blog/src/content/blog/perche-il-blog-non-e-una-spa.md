---
title: "Perché questo blog non è fatto come il negozio"
description: "Il catalogo è un'applicazione React, questi articoli sono file HTML generati una volta. Due mestieri diversi, due strumenti diversi."
pubDate: 2026-10-24
author: "Il corso di Frontend Development"
tags: ["dietro-le-quinte"]
prodotti: []
---

Se aprite il negozio e questo blog uno dopo l'altro, sembrano lo stesso sito.
Dentro non lo sono affatto, e la differenza è una scelta, non una dimenticanza.

## Il negozio deve far fare, il blog deve far leggere

Nel catalogo si cerca, si filtra, si accede, si riempie un carrello. Sono azioni:
cambiano a ogni clic e dipendono da chi siete. Per questo il negozio è
un'applicazione React che si carica una volta e poi parla con un'API: tutto
accade nel vostro browser, senza ricaricare la pagina.

Questo articolo, invece, è lo stesso per tutti e cambia solo quando lo
riscriviamo. Non c'è niente da calcolare quando lo aprite. Quindi non lo
calcoliamo: lo generiamo una volta, al momento della pubblicazione, e quello che
arriva al vostro browser è un file HTML già scritto.

## Cosa cambia per chi legge

Il peso. Questa pagina arriva praticamente senza JavaScript: il browser scarica
dell'HTML, lo disegna e ha finito. Non deve eseguire un'applicazione per
mostrarvi del testo. Su una connessione lenta o su un telefono vecchio la
differenza non è una sensazione, sono secondi.

E la trovabilità. Un motore di ricerca legge questa pagina e trova il titolo, il
testo, le date e i link, perché ci sono già. In un'applicazione che costruisce
tutto in JavaScript, al primo passaggio, spesso non trova niente.

## Il punto in cui le due cose si toccano

C'è un dettaglio che tradisce la differenza: i prezzi. Quando un articolo di
questo blog cita un prodotto, il prezzo viene letto **al momento della
generazione della pagina**. Se domani lo cambiamo nel catalogo, qui resta quello
vecchio finché il blog non viene rigenerato.

Si può sistemare, e l'abbiamo fatto: accanto al prezzo "congelato" c'è un piccolo
pezzo di pagina, e solo quello, che al momento della visita chiede all'API il
prezzo aggiornato. Un'isola di interattività in un mare di HTML statico. Il resto
della pagina non ne sa niente e non paga niente.

## La morale, per chi studia queste cose

Non esiste lo strumento giusto: esiste lo strumento giusto per quel pezzo. La
stessa azienda, lo stesso catalogo, gli stessi dati, e tre tecnologie diverse
nello stesso repository, ognuna dove rende meglio.
