import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export function HeaderLogo() {
  return (
    <View style={styles.container}>
      <Image 
        source={require('./../assets/images/SmartAgri.png')} 
        style={styles.logo} 
        resizeMode="contain"
      />
      <Text style={styles.title}>
        <Text style={styles.smart}>Smart</Text>
        <Text style={styles.agri}>Agri</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 45,
  },
  logo: {
    marginRight: 8,
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '900', // Extra bold for the logo text
    letterSpacing: -0.5,
  },
  smart: {
    color: '#007598', // Blue/teal
  },
  agri: {
    color: '#41A838', // Green
  }
});
