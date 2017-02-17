# Gravity Multiplayer Space Shooter

## Gameplay

Deux équipes de X joueurs combattent dans une arène spaciale de taille A\*B

L'arène est entournée d'un bouclier reflecteur de projectile, lorsqu'un joueur tire un laser, celui-ci peut rebondir sur un bords, réduisant les dégats d'impact sur un vaisseau.

**Laser**
* Lorsqu'il vient d'être tiré, sa couleur sera rouge, ses dégats seront maximisés s'il impacte un adversaire.
* Après un premier rebond, il devient bleu, ses dégats sont réduits mais sa vitesse augmente.
* Lors du second rebond, il devient vert, ses dégats sont minimes et sa vitesse maximale.
* Finalement, si le projectile rebondi un troisième fois, il se désintègre, un bonus apparait alors ou son dernier rebond s'est produit (décélérant sur la trajectoire).

**Vaisseaux**
* Chasseur: vitesse élevée, faible puissance de frappe, fragile
* UFO: vitesse élevée, aucune puissance de frappe, bouclier réflecteur ultra-puissant
* Frégate: vitesse moyenne, puissance de frappe modérée, résistant
* Croiseur: vitesse faible, puissance de frappe élevée, très résistant