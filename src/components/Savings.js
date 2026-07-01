import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from "../theme/ThemeContext";

const Savings = ({ name, description, image }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    return (
        <View style={styles.cardWrapper}>

            <View style={styles.infoWrapper}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.description}>{description}</Text>
            </View>

            <Image source={image} style={styles.img} />

        </View>
    );
};

const makeStyles = (c) =>
    StyleSheet.create({
        cardWrapper: {
            flexDirection: 'row',
            backgroundColor: c.card,
            borderRadius: 8,
            width: '90%',
            alignSelf: 'center',
            marginBottom: 15,
            elevation: 3,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
        },

        img: {
            width: 100,
            height: 100,
            borderTopRightRadius: 8,
            borderBottomRightRadius: 8,
        },

        infoWrapper: {
            marginLeft: 20,
            marginTop: 20,
            flex: 1,
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

export default Savings;
