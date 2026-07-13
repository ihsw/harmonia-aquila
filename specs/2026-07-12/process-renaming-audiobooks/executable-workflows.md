# Executable workflows

Every row below passed `copy-and-rename` dry-run against `etc/audiobooks/3-renamed-files/`. Run the dry-run again immediately before its execute command.

## rename-1

Source: `etc/audiobooks/1-source-files/renaming/A Billion Wicked Thoughts What the Worlds Largest Experiment Reveals About Human Desire.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Sai Goddam, Ogi Ogas - A Billion Wicked Thoughts: What the World's Largest Experiment Reveals About Human Desire.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/A Billion Wicked Thoughts What the Worlds Largest Experiment Reveals About Human Desire.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/A Billion Wicked Thoughts What the Worlds Largest Experiment Reveals About Human Desire.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Sai Goddam, Ogi Ogas - A Billion Wicked Thoughts: What the World's Largest Experiment Reveals About Human Desire.m4b" \
  --format json
```

## rename-2

Source: `etc/audiobooks/1-source-files/renaming/Abigail Shrier - Bad Therapy Why The Kids Aren't Growing Up/Abigail Shrier - Bad Therapy Why the Kids Aren't Growing Up.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Abigail Shrier - Bad Therapy: Why the Kids Aren't Growing Up.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Abigail Shrier - Bad Therapy Why The Kids Aren't Growing Up/Abigail Shrier - Bad Therapy Why the Kids Aren't Growing Up.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Abigail Shrier - Bad Therapy Why The Kids Aren't Growing Up/Abigail Shrier - Bad Therapy Why the Kids Aren't Growing Up.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Abigail Shrier - Bad Therapy: Why the Kids Aren't Growing Up.m4b" \
  --format json
```

## rename-3

Source: `etc/audiobooks/1-source-files/renaming/Alone at Dawn - Dan Schilling (M4B)/Alone at Dawn.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Dan Schilling, Lori Longfritz - Alone at Dawn: Medal of Honor Recipient John Chapman and the Untold Story of the World's Deadliest Special Operations Force.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Alone at Dawn - Dan Schilling (M4B)/Alone at Dawn.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Alone at Dawn - Dan Schilling (M4B)/Alone at Dawn.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Dan Schilling, Lori Longfritz - Alone at Dawn: Medal of Honor Recipient John Chapman and the Untold Story of the World's Deadliest Special Operations Force.m4b" \
  --format json
```

## rename-4

Source: `etc/audiobooks/1-source-files/renaming/Barbarians Inside the Gates and Other Controversial Essays.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Thomas Sowell - Barbarians Inside the Gates and Other Controversial Essays.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Barbarians Inside the Gates and Other Controversial Essays.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Barbarians Inside the Gates and Other Controversial Essays.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Thomas Sowell - Barbarians Inside the Gates and Other Controversial Essays.m4b" \
  --format json
```

## rename-5

Source: `etc/audiobooks/1-source-files/renaming/Death of the Territories - Tim Hornbaker (M4B)/Death of the Territories.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Tim Hornbaker - Death of the Territories: Expansion, Betrayal and the War That Changed Pro Wrestling Forever (Unabridged).m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Death of the Territories - Tim Hornbaker (M4B)/Death of the Territories.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Death of the Territories - Tim Hornbaker (M4B)/Death of the Territories.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Tim Hornbaker - Death of the Territories: Expansion, Betrayal and the War That Changed Pro Wrestling Forever (Unabridged).m4b" \
  --format json
```

## rename-6

Source: `etc/audiobooks/1-source-files/renaming/Haidt, Lukianoff  - The Coddling of the American Mind/Haidt, Lukianoff  - The Coddling of the American Mind.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Jonathan Haidt, Greg Lukianoff - The Coddling of the American Mind.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Haidt, Lukianoff  - The Coddling of the American Mind/Haidt, Lukianoff  - The Coddling of the American Mind.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Haidt, Lukianoff  - The Coddling of the American Mind/Haidt, Lukianoff  - The Coddling of the American Mind.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Jonathan Haidt, Greg Lukianoff - The Coddling of the American Mind.m4b" \
  --format json
```

## rename-7

Source: `etc/audiobooks/1-source-files/renaming/Jonathan Haidt - The Anxious Generation (2024).m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Jonathan Haidt - The Anxious Generation.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Jonathan Haidt - The Anxious Generation (2024).m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Jonathan Haidt - The Anxious Generation (2024).m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Jonathan Haidt - The Anxious Generation.m4b" \
  --format json
```

## rename-8

Source: `etc/audiobooks/1-source-files/renaming/Marxism by Thomas Sowell/Marxism - Philosophy and Economics.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Thomas Sowell - Marxism: Philosophy and Economics (Unabridged).m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Marxism by Thomas Sowell/Marxism - Philosophy and Economics.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Marxism by Thomas Sowell/Marxism - Philosophy and Economics.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Thomas Sowell - Marxism: Philosophy and Economics (Unabridged).m4b" \
  --format json
```

## rename-9

Source: `etc/audiobooks/1-source-files/renaming/Michael Lewis - Flash Boys A Wall Street Revolt/Flash Boys A Wall Street Revolt.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Michael Lewis - Flash Boys: A Wall Street Revolt.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Michael Lewis - Flash Boys A Wall Street Revolt/Flash Boys A Wall Street Revolt.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Michael Lewis - Flash Boys A Wall Street Revolt/Flash Boys A Wall Street Revolt.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Michael Lewis - Flash Boys: A Wall Street Revolt.m4b" \
  --format json
```

## rename-10

Source: `etc/audiobooks/1-source-files/renaming/Michael Lewis - Moneyball The Art of Winning an Unfair Game/Moneyball The Art of Winning an Unfair Game.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Michael Lewis - Moneyball: The Art of Winning an Unfair Game.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Michael Lewis - Moneyball The Art of Winning an Unfair Game/Moneyball The Art of Winning an Unfair Game.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Michael Lewis - Moneyball The Art of Winning an Unfair Game/Moneyball The Art of Winning an Unfair Game.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Michael Lewis - Moneyball: The Art of Winning an Unfair Game.m4b" \
  --format json
```

## rename-11

Source: `etc/audiobooks/1-source-files/renaming/Michael Shellenberger - San Fransicko/San Fransicko - Why Progressives Ruin Cities.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Michael Shellenberger - San Fransicko: Why Progressives Ruin Cities.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Michael Shellenberger - San Fransicko/San Fransicko - Why Progressives Ruin Cities.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Michael Shellenberger - San Fransicko/San Fransicko - Why Progressives Ruin Cities.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Michael Shellenberger - San Fransicko: Why Progressives Ruin Cities.m4b" \
  --format json
```

## rename-12

Source: `etc/audiobooks/1-source-files/renaming/Neil Gorsuch And Janie Nitze - Over Ruled.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Neil Gorsuch, Janie Nitze - Over Ruled: The Human Toll of Too Much Law.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Neil Gorsuch And Janie Nitze - Over Ruled.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Neil Gorsuch And Janie Nitze - Over Ruled.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Neil Gorsuch, Janie Nitze - Over Ruled: The Human Toll of Too Much Law.m4b" \
  --format json
```

## rename-13

Source: `etc/audiobooks/1-source-files/renaming/Revolt Against the Modern World (2022)/Revolt Against the Modern World.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Julius Evola - Revolt Against the Modern World: Politics, Religion, and Social Order in the Kali Yuga.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Revolt Against the Modern World (2022)/Revolt Against the Modern World.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Revolt Against the Modern World (2022)/Revolt Against the Modern World.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Julius Evola - Revolt Against the Modern World: Politics, Religion, and Social Order in the Kali Yuga.m4b" \
  --format json
```

## rename-14

Source: `etc/audiobooks/1-source-files/renaming/Ride the Tiger_ A Survival Manual for the Aristocrats of the Soul/Ride the Tiger_ A Survival Manual for the Aristocrats of the Soul.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Julius Evola, Joscelyn Godwin - translator, Constance Fontana - translator - Ride the Tiger: A Survival Manual for the Aristocrats of the Soul.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Ride the Tiger_ A Survival Manual for the Aristocrats of the Soul/Ride the Tiger_ A Survival Manual for the Aristocrats of the Soul.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Ride the Tiger_ A Survival Manual for the Aristocrats of the Soul/Ride the Tiger_ A Survival Manual for the Aristocrats of the Soul.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Julius Evola, Joscelyn Godwin - translator, Constance Fontana - translator - Ride the Tiger: A Survival Manual for the Aristocrats of the Soul.m4b" \
  --format json
```

## rename-15

Source: `etc/audiobooks/1-source-files/renaming/Shrier, Abigail - Irreversible Damage, The Transgender Craze Seducing Our Daughters.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Abigail Shrier - Irreversible Damage: The Transgender Craze Seducing Our Daughters.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Shrier, Abigail - Irreversible Damage, The Transgender Craze Seducing Our Daughters.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Shrier, Abigail - Irreversible Damage, The Transgender Craze Seducing Our Daughters.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Abigail Shrier - Irreversible Damage: The Transgender Craze Seducing Our Daughters.m4b" \
  --format json
```

## rename-16

Source: `etc/audiobooks/1-source-files/renaming/Steven L. Kent - The Ultimate History of Video Games, Volume 1/The Ultimate History of Video Games, Volume 1.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Steven L. Kent - The Ultimate History of Video Games, Volume 1.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Steven L. Kent - The Ultimate History of Video Games, Volume 1/The Ultimate History of Video Games, Volume 1.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Steven L. Kent - The Ultimate History of Video Games, Volume 1/The Ultimate History of Video Games, Volume 1.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Steven L. Kent - The Ultimate History of Video Games, Volume 1.m4b" \
  --format json
```

## rename-17

Source: `etc/audiobooks/1-source-files/renaming/Steven L. Kent - The Ultimate History of Video Games, Volume 2/The Ultimate History of Video Games, Volume 2.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Steven L. Kent - The Ultimate History of Video Games, Volume 2.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Steven L. Kent - The Ultimate History of Video Games, Volume 2/The Ultimate History of Video Games, Volume 2.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Steven L. Kent - The Ultimate History of Video Games, Volume 2/The Ultimate History of Video Games, Volume 2.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Steven L. Kent - The Ultimate History of Video Games, Volume 2.m4b" \
  --format json
```

## rename-18

Source: `etc/audiobooks/1-source-files/renaming/Teaming With Microbes - Jeff Lowenfels (M4B)/Teaming with Microbes The Organic Gardener's Guide to the Soil Food Web.m4b`  
Expected destination: `etc/audiobooks/3-renamed-files/Jeff Lowenfels, Wayne Lewis - Teaming with Microbes: The Organic Gardener's Guide to the Soil Food Web.m4b`

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Teaming With Microbes - Jeff Lowenfels (M4B)/Teaming with Microbes The Organic Gardener's Guide to the Soil Food Web.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --format json

# After the dry-run reports the expected would-copy destination:
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/renaming/Teaming With Microbes - Jeff Lowenfels (M4B)/Teaming with Microbes The Organic Gardener's Guide to the Soil Food Web.m4b" \
  --dest-dir "etc/audiobooks/3-renamed-files" \
  --execute \
  --format json

harmonia-aquila manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/Jeff Lowenfels, Wayne Lewis - Teaming with Microbes: The Organic Gardener's Guide to the Soil Food Web.m4b" \
  --format json
```

