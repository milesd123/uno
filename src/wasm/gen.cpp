//
// Created by md on 11/28/25.
//
#include <random>
// https://isocpp.org/files/papers/n3551.pdf

extern "C" int generator(const int seed) {
    // use mersenne twister 
    std::mt19937 rng(seed);

    std::uniform_int_distribution<int> dist(0, 59);
    
    int card = dist(rng);
    return card;
}
