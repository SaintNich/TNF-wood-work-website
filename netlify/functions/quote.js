const ORIGIN_STATE = process.env.TNF_ORIGIN_STATE || "SC"; // Chapin, SC by default
const DEFAULT_METHOD = "standard";

// --- ZIP3 → Zone mapping ---
function buildZip3Map(zoneText) {
  const map = Object.create(null);
  for (const [zone, txt] of Object.entries(zoneText)) {
    txt
      .split(/\s+/)
      .filter(Boolean)
      .forEach((code) => {
        const zip3 = String(code).padStart(3, "0");
        map[zip3] = zone;
      });
  }
  return map;
}

const ZONE_TEXT = {
  A: `272 273 280 281 282 290 291 292 293 294 295 296 297 298 299 304 306 308 309 310 311 312 314`,
  B: `192 230 238 239 240 241 242 243 244 245 246 247 248 249 250 251 252 253 255 256 257 258 259 270 271 274 275 276 277
      278 283 284 285 286 287 288 289 300 301 302 303 305 307 313 315 316 317 318 319 320 322 359 360 361 362 363 368 373
      374 376 377 378 379 398 399 407 408 409 412 413 414 415 416 417 418 425 426`,
  C: `070 071 072 073 074 075 077 078 079 080 081 082 083 084 085 086 087 088 089 101 102 103 104 110 111 112 113 116 147
      150 151 152 153 154 155 156 157 158 159 160 161 162 163 164 165 166 167 168 169 170 171 172 173 174 175 176 177 178
      179 180 181 182 183 184 185 186 187 188 189 190 191 193 194 195 196 197 198 199 200 201 202 203 204 205 206 207 208
      209 210 211 212 214 215 216 217 218 219 220 221 222 223 224 225 226 227 228 229 231 232 233 234 235 236 237 254 260
      261 262 263 264 265 266 267 268 279 321 323 324 325 326 327 328 329 331 332 333 334 335 336 337 338 339 341 342 344
      346 347 349 350 351 352 354 355 356 357 358 364 365 366 367 369 370 371 372 375 380 381 382 383 384 385 386 387 388
      389 390 391 392 393 394 395 396 397 400 401 402 403 404 405 406 410 411 420 421 422 423 424 427 430 431 432 433 434
      435 436 437 438 439 440 441 442 443 444 445 446 447 448 449 450 451 452 453 454 455 456 457 458 459 460 461 465 466
      467 468 469 470 471 472 473 474 475 476 477 478 479 481 482 492 617 618 619 620 622 624 628 629 633 636 637 638 639
      700 701 704 723 724 725`,
  D: `005 010 011 012 013 014 015 016 017 018 019 020 021 022 023 024 025 026 027 028 029 030 031 032 033 034 035 036 037
      038 039 040 041 042 043 044 045 048 049 050 051 052 053 054 055 056 057 058 059 060 061 062 063 064 065 066 067 068
      069 076 100 105 106 107 108 109 114 115 117 118 119 120 121 122 123 124 125 126 127 128 129 130 131 132 133 134 135
      136 137 138 139 140 141 142 143 144 145 146 148 149 330 462 463 464 480 483 484 485 486 487 488 489 490 491 493 494
      495 496 497 498 499 500 501 502 503 504 505 506 507 508 509 510 511 512 513 514 515 516 520 521 522 523 524 525 526
      527 528 530 531 532 534 535 537 538 539 540 541 542 543 544 545 546 547 548 549 550 555 559 560 561 600 601 602 603
      604 605 606 607 608 609 610 611 612 613 614 615 616 623 625 626 627 630 631 634 635 640 641 644 645 646 647 648 649
      650 651 652 653 654 655 656 657 658 660 661 662 664 665 666 667 668 669 670 671 672 673 674 675 680 681 683 684 685
      686 703 705 706 707 708 710 711 712 713 714 716 717 718 719 720 721 722 726 727 728 729 730 731 733 734 735 736 737
      740 741 743 744 745 746 747 748 749 750 751 752 753 754 755 756 757 758 759 760 761 762 763 764 765 766 767 770 772
      773 774 775 776 777 778 779 786 789`,
  E: `046 047 551 553 554 556 557 558 562 563 564 565 566 567 569 570 571 572 573 574 575 576 577 580 581 582 583 584 585
      676 677 678 679 687 688 689 690 691 692 693 738 739 768 769 780 781 782 783 784 785 787 788 790 791 792 793 794 795
      796 797 798 800 801 802 803 804 805 806 807 808 809 810 811 820 822 842 875 877 881 882 883 884`,
  F: `586 587 588 590 591 592 593 595 799 812 813 814 815 816 821 823 824 825 826 827 828 829 830 831 832 834 840 841 843
      844 845 846 847 850 851 852 853 855 856 857 859 860 863 865 870 871 873 874 878 879 880 885 942`,
  G: `594 596 597 598 599 833 835 836 837 838 864 889 890 891 893 894 895 897 898 900 901 902 903 904 905 906 907 908 910
      911 912 913 914 915 916 917 918 919 920 921 922 923 924 925 926 927 928 930 931 932 933 934 935 936 937 938 939 940
      941 943 944 945 946 947 948 949 950 951 952 953 954 955 956 957 958 959 960 961 970 971 972 973 974 975 976 977 978
      979 980 981 982 983 984 985 986 988 989 990 991 992 993 994`,
};

const ZIP3_TO_ZONE = buildZip3Map(ZONE_TEXT);
const NON_CONTINENTAL = new Set(["967", "968", "995", "996", "997", "998", "999"]); // HI + AK

function getZip3(postalCode) {
  const digits = String(postalCode || "").replace(/[^0-9]/g, "");
  if (digits.length < 3) return null;
  return digits.slice(0, 3);
}

function zoneForZip3(postalCode) {
  const z3 = getZip3(postalCode);
  if (!z3 || NON_CONTINENTAL.has(z3)) return null;
  return ZIP3_TO_ZONE[z3] || null;
}

const RATE_TABLE = {
  standard: {
    A: [ [5, 999], [10, 999], [15, 1049], [20, 1099], ],
    B: [ [5, 999], [10, 999], [15, 1099], [20, 1249], ],
    C: [ [5, 1099], [10, 1099], [15, 1199], [20, 1249], ],
    D: [ [5, 1249], [10, 1299], [15, 1349], [20, 1499], ],
    E: [ [5, 1449], [10, 1499], [15, 1599], [20, 1749], ],
    F: [ [5, 1599], [10, 1649], [15, 1799], [20, 1999], ],
    G: [ [5, 2099], [10, 2099], [15, 2299], [20, 2549], ],
  }
};

function pickRateCents(method, zone, totalLb) {
  const rows = RATE_TABLE[method]?.[zone];
  if (!rows) return 0;
  for (const [maxLb, cents] of rows) if (totalLb <= maxLb) return cents;
  return rows[rows.length - 1][1];
}

function computeTaxCents({ subtotalCents, shippingCents, state }) {
  const rate = 0.07;
  if ((state || "").toUpperCase() !== "SC") return 0;
  const tax = Math.round((subtotalCents + shippingCents) * rate);
  console.log("[TAX DEBUG]", { subtotalCents, shippingCents, tax, state });
  return tax;
}

function cents(n) {
  return Math.max(0, Math.round(Number(n) || 0));
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {}
  const items = Array.isArray(payload.items) ? payload.items : [];
  const address = payload.address || {};
  const method = payload.method || address.method || DEFAULT_METHOD;
  const subtotalCents = cents(items.reduce((s, i) => s + (Number(i.priceCents) || 0) * (i.qty || 1), 0));
  const totalWeightLb = Math.max(
    0,
    Math.round(items.reduce((s, i) => s + (Number(i.weightLb) || 0) * (i.qty || 1), 0))
  );

  const zone = zoneForZip3(address.postalCode);
  let shippingCents = pickRateCents(method, zone, totalWeightLb);
  for (const item of items) {
    if (item.oversizeFeeCents) {
        shippingCents += Number(item.oversizeFeeCents) * (item.qty || 1);
    }
  }
  
  const taxCents = computeTaxCents({ subtotalCents, shippingCents, state: address.state });
  const totalCents = subtotalCents + shippingCents + taxCents;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method,
      zone,
      totalWeightLb,
      shippingCents,
      taxCents,
      totalCents,
    }),
  };
}
