import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from "../theme/ThemeContext";

const OffersComponent = ({ name, description, image }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.cardWrapper}>

      <View style={styles.infoWrapper}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <Image source={image} style={styles.img} resizeMode="cover" />

    </View>
  );
};

const makeStyles = (c) =>
  StyleSheet.create({
    cardWrapper: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      width: '90%',
      alignSelf: 'center',
      marginBottom: 15,
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      height: 150,
      overflow: 'hidden',
    },

    img: {
      width: 120,
      height: '100%',
    },

    infoWrapper: {
      flex: 1,
      padding: 15,
      justifyContent: 'center',
    },

    name: {
      fontWeight: 'bold',
      fontSize: 18,
      marginBottom: 5,
      color: c.text,
    },

    description: {
      color: c.textSecondary,
    },
  });

export default OffersComponent;
